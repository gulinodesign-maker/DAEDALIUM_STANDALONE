/* B&B Smart 2.353: scanner documentale web offline, analisi locale senza upload o dipendenze esterne.
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
  // 2.353: ricerca di quattro lati indipendenti, anche obliqui/non paralleli.
  // In 2.353 erano ammessi essenzialmente lati quasi orizzontali/verticali:
  // in una foto prospettica veniva quindi usato il rettangolo di fallback.
  function detectFlexible(gray,w,h){
    if(w<100||h<100)return null;
    var n=w*h, smooth=new Uint8Array(n), strength=new Uint16Array(n),orientation=new Uint8Array(n);
    for(var y=1;y<h-1;y++)for(var x=1;x<w-1;x++){
      var i=y*w+x;
      smooth[i]=(gray[i-w-1]+gray[i-w]+gray[i-w+1]+gray[i-1]+gray[i]+gray[i+1]+gray[i+w-1]+gray[i+w]+gray[i+w+1])/9|0;
    }
    var histogram=new Uint32Array(1024),edges=0;
    for(y=3;y<h-3;y++)for(x=3;x<w-3;x++){
      var k=y*w+x;
      var gx=smooth[k-w+1]+2*smooth[k+1]+smooth[k+w+1]-smooth[k-w-1]-2*smooth[k-1]-smooth[k+w-1];
      var gy=smooth[k+w-1]+2*smooth[k+w]+smooth[k+w+1]-smooth[k-w-1]-2*smooth[k-w]-smooth[k-w+1];
      var m=Math.min(1023,Math.round(Math.hypot(gx,gy)));
      strength[k]=m;
      if(m<25)continue;
      var a=Math.atan2(gy,gx)*180/PI;
      if(a<0)a+=180;
      orientation[k]=Math.round(a)%180;
      histogram[m]++;edges++;
    }
    if(edges<Math.min(300,n*.004))return null;
    var counted=0,threshold=60;
    for(var v=1023;v>=45;v--){counted+=histogram[v];if(counted>=edges*.32){threshold=v;break;}}
    threshold=Math.max(60,threshold);
    var R=Math.ceil(Math.hypot(w,h))+3,len=R*2+1,acc=new Uint16Array(len*180);
    var cosine=new Float32Array(180),sine=new Float32Array(180);
    for(var t=0;t<180;t++){cosine[t]=Math.cos(t*PI/180);sine[t]=Math.sin(t*PI/180);}
    for(y=4;y<h-4;y+=2)for(x=4;x<w-4;x+=2){
      k=y*w+x;
      if(strength[k]<threshold)continue;
      var theta=orientation[k];
      for(var delta=-3;delta<=3;delta++){
        t=(theta+delta+180)%180;
        var rho=Math.round(x*cosine[t]+y*sine[t])+R;
        var index=t*len+rho;
        if(acc[index]<65500)acc[index]+=delta===0?4:delta===-1||delta===1?2:1;
      }
    }
    var peaks=[],peakMin=Math.max(17,Math.min(w,h)*.055);
    for(t=0;t<180;t++){
      var start=t*len;
      for(var r=R-Math.ceil(w+h);r<R+Math.ceil(w+h);r++){
        if(r<4||r>=len-4)continue;
        var votes=acc[start+r];if(votes<peakMin)continue;
        if(votes<acc[start+r-2]||votes<acc[start+r+2]||votes<acc[start+r-1]||votes<acc[start+r+1])continue;
        peaks.push({c:cosine[t],s:sine[t],r:r-R,a:t,v:votes});
      }
    }
    peaks.sort(function(a,b){return b.v-a.v;});
    var lines=[];
    for(var q=0;q<peaks.length&&lines.length<85;q++){
      var p=peaks[q],duplicate=false;
      for(var z=0;z<lines.length;z++){
        var other=lines[z],diff=Math.abs(p.a-other.a),same=Math.abs(p.r-other.r)<9&&diff<7,
          wrap=Math.abs(p.r+other.r)<9&&diff>173;
        if(same||wrap){duplicate=true;break;}
      }
      if(!duplicate)lines.push(p);
    }
    if(lines.length<4)return null;
    var bases=[];
    for(q=0;q<Math.min(55,lines.length);q++){
      p=lines[q];
      if(bases.every(function(a){var d=Math.abs(a-p.a)%90;return Math.min(d,90-d)>10;}))bases.push(p.a);
      if(bases.length>=9)break;
    }
    var cx=w/2,cy=h/2,candidates=[];
    function family(base){
      var negative=[],positive=[];
      for(var i=0;i<lines.length;i++){
        var line=lines[i],difference=line.a-base;
        var angular=Math.abs(((difference+270)%180)-90);
        if(angular>27)continue;
        var sign=Math.cos(difference*PI/180)<0?-1:1;
        var pos=(line.r-cx*line.c-cy*line.s)*sign;
        var adjusted={c:line.c,s:line.s,r:line.r,v:line.v,pos:pos,a:line.a};
        if(pos< -Math.min(w,h)*.10)negative.push(adjusted);
        else if(pos>Math.min(w,h)*.10)positive.push(adjusted);
      }
      function top(list){
        list.sort(function(a,b){return b.v-a.v;});
        var kept=[];
        for(var j=0;j<list.length;j++){
          var candidate=list[j];
          if(kept.every(function(b){return Math.abs(b.pos-candidate.pos)>Math.min(w,h)*.065;}))kept.push(candidate);
          if(kept.length===6)break;
        }
        return kept;
      }
      return [top(negative),top(positive)];
    }
    function ordered(vertices){
      var centerX=0,centerY=0;
      vertices.forEach(function(p){centerX+=p.x;centerY+=p.y;});centerX/=4;centerY/=4;
      vertices.sort(function(a,b){return Math.atan2(a.y-centerY,a.x-centerX)-Math.atan2(b.y-centerY,b.x-centerX);});
      var index=0,minimum=Infinity;
      vertices.forEach(function(p,i){var sum=p.x+p.y;if(sum<minimum){minimum=sum;index=i;}});
      var result=[];for(var i=0;i<4;i++)result.push(vertices[(index+i)%4]);
      // TL, TR, BR, BL (clockwise in image coordinates)
      if(result[1].x<result[3].x)result=[result[0],result[3],result[2],result[1]];
      return result;
    }
    function validQuad(v){
      for(var i=0;i<4;i++){
        if(!v[i]||!isFinite(v[i].x)||!isFinite(v[i].y))return false;
        if(v[i].x < -w*.018||v[i].x > w*1.018||v[i].y < -h*.018||v[i].y>h*1.018)return false;
      }
      var s=0;
      for(i=0;i<4;i++){
        var a=v[i],b=v[(i+1)%4],c=v[(i+2)%4];
        var cr=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);
        if(cr<5)return false;
        s+=Math.hypot(b.x-a.x,b.y-a.y);
      }
      var cover=quadArea(v)/(w*h);
      if(cover<.12||cover>.92)return false;
      var wt=(Math.hypot(v[1].x-v[0].x,v[1].y-v[0].y)+Math.hypot(v[2].x-v[3].x,v[2].y-v[3].y))/2;
      var ht=(Math.hypot(v[3].x-v[0].x,v[3].y-v[0].y)+Math.hypot(v[2].x-v[1].x,v[2].y-v[1].y))/2;
      if(wt<.20*w||ht<.18*h||wt/ht<.33||wt/ht>3.2)return false;
      return cover;
    }
    for(var bi=0;bi<bases.length;bi++){
      var groupA=family(bases[bi]),groupB=family((bases[bi]+90)%180);
      if(!groupA[0].length||!groupA[1].length||!groupB[0].length||!groupB[1].length)continue;
      for(var a0=0;a0<groupA[0].length;a0++)for(var a1=0;a1<groupA[1].length;a1++)
      for(var b0=0;b0<groupB[0].length;b0++)for(var b1=0;b1<groupB[1].length;b1++){
        var A=groupA[0][a0],B=groupA[1][a1],C=groupB[0][b0],D=groupB[1][b1];
        var rawPoints=[intersection(A,C),intersection(B,C),intersection(B,D),intersection(A,D)];
        if(rawPoints.some(function(pt){return !pt||!isFinite(pt.x)||!isFinite(pt.y);}))continue;
        var points=ordered(rawPoints);
        var cover=validQuad(points);if(!cover)continue;
        var midX=points.reduce(function(v,p){return v+p.x;},0)/4,midY=points.reduce(function(v,p){return v+p.y;},0)/4;
        var centerError=Math.abs(midX/w-.5)+Math.abs(midY/h-.5);
        var votes=(A.v+B.v+C.v+D.v)/(w+h);
        candidates.push({points:points,cover:cover,pre:cover*2+Math.min(3,votes)*.6-centerError*.7,votes:votes});
      }
    }
    if(!candidates.length)return null;
    candidates.sort(function(a,b){return b.pre-a.pre;});
    var best=null,bestScore=-Infinity;
    for(var ci=0;ci<Math.min(85,candidates.length);ci++){
      var quad=candidates[ci],hits=0,samples=0;
      for(var side=0;side<4;side++){
        var start=quad.points[side],end=quad.points[(side+1)%4];
        for(var point=2;point<=30;point++){
          var mix=point/32,xx=Math.round(start.x+(end.x-start.x)*mix),yy=Math.round(start.y+(end.y-start.y)*mix);
          var maximum=0;
          for(var ry=-2;ry<=2;ry++)for(var rx=-2;rx<=2;rx++){
            var px=xx+rx,py=yy+ry;
            if(px>2&&px<w-2&&py>2&&py<h-2)maximum=Math.max(maximum,strength[py*w+px]);
          }
          if(maximum>threshold*.75)hits++;samples++;
        }
      }
      var support=hits/samples;
      // Più importante del semplice ingombro: quattro bordi realmente presenti.
      var score=support*4.5+quad.cover*1.15+Math.min(3,quad.votes)*.35;
      if(score>bestScore){bestScore=score;best={corners:quad.points.map(function(p){return {x:clamp(p.x/w,0,1),y:clamp(p.y/h,0,1)};}),confidence:support,coverage:quad.cover,score:score};}
    }
    return best&&best.confidence>=.30?best:null;
  }

  // Seconda strategia: distingue il foglio dallo sfondo in condizioni di luce
  // uniforme, anche quando i bordi sono poco contrastati (scrivania chiara).
  function detectContrast(gray,w,h){
    if(w<100||h<100)return null;
    var n=w*h;
    function patchCenter(fx,fy){
      var px=Math.round(fx*w),py=Math.round(fy*h),total=0,count=0;
      for(var y=Math.max(0,py-7);y<Math.min(h,py+8);y+=2)for(var x=Math.max(0,px-7);x<Math.min(w,px+8);x+=2){total+=gray[y*w+x];count++;}
      return total/Math.max(count,1);
    }
    var c00=patchCenter(.025,.025),c10=patchCenter(.975,.025),c11=patchCenter(.975,.975),c01=patchCenter(.025,.975);
    var mask=new Uint8Array(n),visited=new Uint8Array(n);
    var spread=Math.max(c00,c10,c11,c01)-Math.min(c00,c10,c11,c01);
    var threshold=23+Math.min(15,spread*.09);
    for(var y=2;y<h-2;y++)for(var x=2;x<w-2;x++){
      var fx=x/w,fy=y/h;
      var top=c00+(c10-c00)*fx,bottom=c01+(c11-c01)*fx,bg=top+(bottom-top)*fy;
      // Il confronto usa una lieve sfocatura per non frammentare il documento
      // a causa di scritte, riquadri e dettagli della carta d'identità.
      var k=y*w+x,subject=(gray[k]+gray[k-1]+gray[k+1]+gray[k-w]+gray[k+w])/5;
      mask[k]=Math.abs(subject-bg)>threshold?1:0;
    }
    var queue=new Int32Array(n),best=null;
    for(var origin=2*w+2;origin<n-2*w;origin++){
      if(!mask[origin]||visited[origin])continue;
      var head=0,tail=1;queue[0]=origin;visited[origin]=1;
      var count=0,edgeTouches=0,sx=0,sy=0;
      var minSum=Infinity,maxSum=-Infinity,minDiff=Infinity,maxDiff=-Infinity;
      var tl=null,tr=null,br=null,bl=null;
      while(head<tail){
        var p=queue[head++],xx=p%w,yy=(p/w)|0;
        count++;sx+=xx;sy+=yy;
        if(xx<5||xx>w-6||yy<5||yy>h-6)edgeTouches++;
        var sum=xx+yy,diff=xx-yy;
        if(sum<minSum){minSum=sum;tl={x:xx,y:yy};}
        if(sum>maxSum){maxSum=sum;br={x:xx,y:yy};}
        if(diff>maxDiff){maxDiff=diff;tr={x:xx,y:yy};}
        if(diff<minDiff){minDiff=diff;bl={x:xx,y:yy};}
        var nb=p-1;
        if(xx>2&&mask[nb]&&!visited[nb]){visited[nb]=1;queue[tail++]=nb;}
        nb=p+1;if(xx<w-3&&mask[nb]&&!visited[nb]){visited[nb]=1;queue[tail++]=nb;}
        nb=p-w;if(yy>2&&mask[nb]&&!visited[nb]){visited[nb]=1;queue[tail++]=nb;}
        nb=p+w;if(yy<h-3&&mask[nb]&&!visited[nb]){visited[nb]=1;queue[tail++]=nb;}
      }
      if(count<n*.075||edgeTouches>count*.035)continue;
      var pts=[tl,tr,br,bl],area=quadArea(pts)/(w*h);
      if(area<.09||area>.93||count/(area*n)<.50)continue;
      var centerX=sx/count,centerY=sy/count;
      var centerPenalty=Math.abs(centerX/w-.5)+Math.abs(centerY/h-.5);
      if(centerPenalty>.65)continue;
      var quality=area*1.2-centerPenalty*.6;
      if(!best||quality>best.quality){best={corners:pts.map(function(p){return {x:p.x/w,y:p.y/h};}),coverage:area,confidence:Math.min(1,count/(area*n)),quality:quality};}
    }
    return best;
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
    var gray=new Uint8Array(w*h);
    for(var i=0;i<gray.length;i++){
      var ix=i*4;gray[i]=Math.round(pixels.data[ix]*.299+pixels.data[ix+1]*.587+pixels.data[ix+2]*.114);
    }
    var found=detectFlexible(gray,w,h);
    var contrasted=detectContrast(gray,w,h);
    if(contrasted && (!found || found.confidence < .58 || (contrasted.confidence > .82 && contrasted.coverage > found.coverage * 1.10)))found=contrasted;
    if(!found){
      var classic=detectGray(gray,w,h);
      if(classic&&classic.coverage>=.13&&classic.confidence>=.5)found=classic;
    }
    if(!found)return {corners:fallback(),automatic:false,reason:'no-borders'};
    return {corners:found.corners,automatic:true,confidence:found.confidence};
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
