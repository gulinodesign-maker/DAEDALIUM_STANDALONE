/* B&B Smart 2.352: scanner documentale web offline, analisi locale senza upload o dipendenze esterne.
   Il bridge WKWebView/VisionKit dell'app iOS nativa resta indipendente. */
(function(root){
  'use strict';
  var PI=Math.PI;
  var clamp=function(n,low,high){return Math.max(low,Math.min(high,n));};
  function fallback(){return [{x:.07,y:.19},{x:.93,y:.19},{x:.93,y:.81},{x:.07,y:.81}];}
  function quadArea(points){
    var s=0;for(var i=0;i<4;i++){var p=points[i],q=points[(i+1)%4];s+=p.x*q.y-q.x*p.y;}return Math.abs(s)/2;
  }
  function solve(A,b){
    // Elimina le incognite con pivot parziale, evitando librerie/trasferimenti di immagini.
    var n=b.length,M=A.map(function(row,i){return row.slice().concat([b[i]]);});
    for(var c=0;c<n;c++){
      var r=c;for(var k=c+1;k<n;k++)if(Math.abs(M[k][c])>Math.abs(M[r][c]))r=k;
      if(Math.abs(M[r][c])<1e-8)return null;
      if(r!==c){var t=M[c];M[c]=M[r];M[r]=t;}
      var div=M[c][c];for(var j=c;j<=n;j++)M[c][j]/=div;
      for(var i=0;i<n;i++)if(i!==c){var f=M[i][c];if(f)for(var jj=c;jj<=n;jj++)M[i][jj]-=f*M[c][jj];}
    }
    return M.map(function(row){return row[n];});
  }
  function intersection(a,b){
    var d=a.c*b.s-a.s*b.c;
    if(Math.abs(d)<.1)return null;
    return {x:(a.r*b.s-a.s*b.r)/d,y:(a.c*b.r-a.r*b.c)/d};
  }
  function cornersFromLines(left,right,top,bottom){
    var pts=[intersection(left,top),intersection(right,top),intersection(right,bottom),intersection(left,bottom)];
    return pts.some(function(p){return !p||!isFinite(p.x)||!isFinite(p.y);})?null:pts;
  }
  function detectGray(gray,w,h){
    if(w<80||h<80)return null;
    var N=w*h, blur=new Uint8Array(N),mag=new Uint16Array(N),ang=new Uint8Array(N);
    // Media 3x3 integrale senza creare grossi buffer su Safari iOS.
    for(var y=1;y<h-1;y++)for(var x=1;x<w-1;x++){
      var i=y*w+x;
      blur[i]=Math.round((gray[i-w-1]+gray[i-w]+gray[i-w+1]+gray[i-1]+gray[i]+gray[i+1]+gray[i+w-1]+gray[i+w]+gray[i+w+1])/9);
    }
    var hist=new Uint32Array(512),edgeCount=0;
    for(y=4;y<h-4;y++)for(x=4;x<w-4;x++){
      var k=y*w+x,tl=blur[k-w-1],tm=blur[k-w],tr=blur[k-w+1],ml=blur[k-1],mr=blur[k+1],bl=blur[k+w-1],bm=blur[k+w],br=blur[k+w+1];
      var gx=tr+2*mr+br-tl-2*ml-bl,gy=bl+2*bm+br-tl-2*tm-tr;
      var strength=Math.min(511,Math.abs(gx)+Math.abs(gy));
      if(strength<28)continue;
      mag[k]=strength;
      var degree=Math.atan2(gy,gx)*180/PI;
      if(degree<0)degree+=180;
      if(degree>=180)degree-=180;
      ang[k]=Math.round(degree)%180;
      hist[strength]++;edgeCount++;
    }
    if(edgeCount<Math.min(250,N*.003))return null;
    var quota=Math.max(140,Math.round(edgeCount*.38)),accu=0,threshold=35;
    for(var s=511;s>=35;s--){accu+=hist[s];if(accu>=quota){threshold=s;break;}}
    threshold=Math.max(45,threshold);
    var dia=Math.ceil(Math.hypot(w,h)),rs=2*dia+3;
    var hough=new Uint16Array(180*rs),co=new Float32Array(180),si=new Float32Array(180);
    for(var th=0;th<180;th++){co[th]=Math.cos(th*PI/180);si[th]=Math.sin(th*PI/180);}
    for(y=6;y<h-6;y+=2)for(x=6;x<w-6;x+=2){
      var p=y*w+x,v=mag[p];if(v<threshold)continue;
      var a=ang[p];
      // Quantificazione orientata al gradiente: evita tutte le angolazioni per pixel.
      for(var d=-2;d<=2;d++){
        th=(a+d+180)%180;
        var rho=Math.round(x*co[th]+y*si[th])+dia;
        var idx=th*rs+rho;
        if(hough[idx]<65530)hough[idx]+=d===0?3:1;
      }
    }
    var vertical=[],horizontal=[],midX=w/2,midY=h/2;
    var peakMin=Math.max(18,Math.min(w,h)*.055);
    for(th=0;th<180;th++){
      var vc=Math.abs(co[th])>.78,hc=Math.abs(si[th])>.78;
      if(!vc&&!hc)continue;
      var base=th*rs;
      for(var rr=dia-Math.ceil(w+h);rr<=dia+Math.ceil(w+h);rr+=2){
        if(rr<2||rr>=rs-2)continue;
        var vote=hough[base+rr];if(vote<peakMin)continue;
        if(vote<hough[base+rr-1]||vote<hough[base+rr+1])continue;
        var line={c:co[th],s:si[th],r:rr-dia,v:vote,a:th};
        if(vc){line.pos=(line.r-midY*line.s)/line.c;if(line.pos>-w*.17&&line.pos<w*1.17)vertical.push(line);}
        if(hc){line.pos=(line.r-midX*line.c)/line.s;if(line.pos>-h*.17&&line.pos<h*1.17)horizontal.push(line);}
      }
    }
    function bestLines(candidates,span){
      candidates.sort(function(a,b){return b.v-a.v;});var list=[];
      for(var i=0;i<candidates.length&&list.length<20;i++){
        var c=candidates[i];
        if(list.every(function(other){return Math.abs(other.pos-c.pos)>span*.045||Math.abs(other.a-c.a)>17;}))list.push(c);
      }
      return list;
    }
    var vs=bestLines(vertical,w),hs=bestLines(horizontal,h),result=null,best=-Infinity;
    for(var i=0;i<vs.length;i++)for(var j=i+1;j<vs.length;j++){
      var vl=vs[i],vr=vs[j];if(vl.pos>vr.pos){var t=vl;vl=vr;vr=t;}
      if(vr.pos-vl.pos<w*.23)continue;
      for(var a=0;a<hs.length;a++)for(var b=a+1;b<hs.length;b++){
        var ht=hs[a],hb=hs[b];if(ht.pos>hb.pos){var z=ht;ht=hb;hb=z;}
        if(hb.pos-ht.pos<h*.20)continue;
        var p4=cornersFromLines(vl,vr,ht,hb);if(!p4)continue;
        if(p4.some(function(p){return p.x<-w*.035||p.x>w*1.035||p.y<-h*.035||p.y>h*1.035;}))continue;
        var area=quadArea(p4)/(w*h);if(area<.10||area>.94)continue;
        var l1=Math.hypot(p4[1].x-p4[0].x,p4[1].y-p4[0].y),l2=Math.hypot(p4[2].x-p4[3].x,p4[2].y-p4[3].y),
            l3=Math.hypot(p4[3].x-p4[0].x,p4[3].y-p4[0].y),l4=Math.hypot(p4[2].x-p4[1].x,p4[2].y-p4[1].y);
        var ratio=(l1+l2)/Math.max(1,l3+l4);if(ratio<.4||ratio>2.8)continue;
        var centerX=p4.reduce(function(v,p){return v+p.x;},0)/4,centerY=p4.reduce(function(v,p){return v+p.y;},0)/4;
        var centerDist=Math.abs(centerX/w-.5)+Math.abs(centerY/h-.5);
        var votes=(vl.v+vr.v+ht.v+hb.v)/(w+h),
            score=votes*2.6+area*2-centerDist*.7-Math.abs(Math.log(ratio/1.45))*.12;
        // Penalizza linee del bordo video anziché del documento reale.
        if(p4.some(function(p){return p.x<6||p.x>w-6||p.y<6||p.y>h-6;}))score-=.5;
        if(score>best){best=score;result={corners:p4,confidence:score,area:area};}
      }
    }
    if(!result)return null;
    return {corners:result.corners.map(function(p){return {x:clamp(p.x/w,0,1),y:clamp(p.y/h,0,1)};}),
      confidence:result.confidence,coverage:result.area};
  }
  function detectData(rgba,w,h){
    var gray;
    if(rgba.length===w*h)gray=rgba;
    else{
      gray=new Uint8Array(w*h);
      for(var i=0;i<gray.length;i++){
        var p=4*i;gray[i]=Math.round(rgba[p]*.299+rgba[p+1]*.587+rgba[p+2]*.114);
      }
    }
    return detectGray(gray,w,h);
  }
  function detect(canvas){
    var sc=Math.min(1,620/Math.max(canvas.width,canvas.height));
    var w=Math.max(1,Math.round(canvas.width*sc)),h=Math.max(1,Math.round(canvas.height*sc));
    var small=document.createElement('canvas');small.width=w;small.height=h;
    var cx=small.getContext('2d',{willReadFrequently:true});if(!cx)return {corners:fallback(),automatic:false};
    cx.drawImage(canvas,0,0,w,h);
    var pixels=cx.getImageData(0,0,w,h);
    var found=detectData(pixels.data,w,h);
    if(!found||found.coverage<.13||found.confidence<.5)return {corners:fallback(),automatic:false};
    return {corners:found.corners,automatic:true};
  }
  function warp(canvas,corners){
    if(!canvas||!corners||corners.length!==4)throw Error('Angoli del documento non validi');
    var sw=canvas.width,sh=canvas.height;
    var pts=corners.map(function(p){return {x:clamp(p.x,0,1)*sw,y:clamp(p.y,0,1)*sh};});
    // Accetta solo quattro angoli in ordine e un quadrilatero convesso abbastanza ampio.
    var sign=0;
    for(var corner=0;corner<4;corner++){
      var pa=pts[corner],pb=pts[(corner+1)%4],pc=pts[(corner+2)%4];
      var cross=(pb.x-pa.x)*(pc.y-pb.y)-(pb.y-pa.y)*(pc.x-pb.x);
      if(Math.abs(cross)<20||sign*cross<0)throw Error('Regola i quattro angoli del documento');
      sign=cross;
    }
    if(quadArea(pts)<sw*sh*.035)throw Error('Inquadra una superficie più ampia');
    var top=Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y),bottom=Math.hypot(pts[2].x-pts[3].x,pts[2].y-pts[3].y);
    var left=Math.hypot(pts[3].x-pts[0].x,pts[3].y-pts[0].y),right=Math.hypot(pts[2].x-pts[1].x,pts[2].y-pts[1].y);
    var outW=clamp(Math.round(Math.max(top,bottom)),260,2200),outH=clamp(Math.round(Math.max(left,right)),200,2200);
    if(outW*outH>3600000){var scale=Math.sqrt(3600000/(outW*outH));outW=Math.round(outW*scale);outH=Math.round(outH*scale);}
    var dest=[{x:0,y:0},{x:outW-1,y:0},{x:outW-1,y:outH-1},{x:0,y:outH-1}];
    // Matrice omografica destinazione->sorgente, 8 coefficienti.
    var A=[],B=[];
    for(var i=0;i<4;i++){
      var x=dest[i].x,y=dest[i].y,u=pts[i].x,v=pts[i].y;
      A.push([x,y,1,0,0,0,-x*u,-y*u]);B.push(u);
      A.push([0,0,0,x,y,1,-x*v,-y*v]);B.push(v);
    }
    var m=solve(A,B);if(!m)throw Error('Impossibile correggere la prospettiva');
    var srcCtx=canvas.getContext('2d',{willReadFrequently:true}),src=srcCtx.getImageData(0,0,sw,sh).data;
    var out=document.createElement('canvas');out.width=outW;out.height=outH;
    var outCtx=out.getContext('2d',{willReadFrequently:true}),img=outCtx.createImageData(outW,outH),dst=img.data;
    for(var yy=0;yy<outH;yy++){
      var u0=m[1]*yy+m[2],v0=m[4]*yy+m[5],d0=m[7]*yy+1;
      for(var xx=0;xx<outW;xx++){
        var den=m[6]*xx+d0;if(Math.abs(den)<1e-10)continue;
        var sx=(m[0]*xx+u0)/den,sy=(m[3]*xx+v0)/den;
        var dstOff=4*(yy*outW+xx);
        sx=clamp(sx,0,sw-1.001);sy=clamp(sy,0,sh-1.001);
        var x0=Math.floor(sx),y0=Math.floor(sy),dx=sx-x0,dy=sy-y0;
        var p=(y0*sw+x0)*4,q=p+4,r=p+sw*4,t=r+4;
        var a=(1-dx)*(1-dy),b=dx*(1-dy),c=(1-dx)*dy,d=dx*dy;
        dst[dstOff]=src[p]*a+src[q]*b+src[r]*c+src[t]*d;
        dst[dstOff+1]=src[p+1]*a+src[q+1]*b+src[r+1]*c+src[t+1]*d;
        dst[dstOff+2]=src[p+2]*a+src[q+2]*b+src[r+2]*c+src[t+2]*d;
        dst[dstOff+3]=255;
      }
    }
    // Contrasto leggero/adattativo, mantenendo i colori del documento d'identità.
    var histogram=new Uint32Array(256),total=0;
    for(var k=0;k<dst.length;k+=48){var bright=(dst[k]*3+dst[k+1]*6+dst[k+2])/10|0;histogram[bright]++;total++;}
    var lo=0,hi=255,count=0;
    for(var v=0;v<256;v++){count+=histogram[v];if(count>=total*.025){lo=v;break;}}
    count=0;for(v=255;v>=0;v--){count+=histogram[v];if(count>=total*.025){hi=v;break;}}
    if(hi-lo>35){
      var gain=clamp(212/(hi-lo),.95,1.15),offset=clamp((20-lo)*.35,-20,20);
      for(k=0;k<dst.length;k+=4){
        dst[k]=clamp((dst[k]-128)*gain+128+offset,0,255);
        dst[k+1]=clamp((dst[k+1]-128)*gain+128+offset,0,255);
        dst[k+2]=clamp((dst[k+2]-128)*gain+128+offset,0,255);
      }
    }
    outCtx.putImageData(img,0,0);
    return out;
  }
  root.BBSmartDocumentScanner={detect:detect,detectData:detectData,warp:warp,fallback:fallback};
})(typeof window!=='undefined'?window:globalThis);
