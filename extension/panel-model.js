(function(root){
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));
  const position=(value,width,height,panelWidth,panelHeight)=>({x:clamp(value?.x,0,1)*Math.max(0,width-panelWidth),y:clamp(value?.y,0,1)*Math.max(0,height-panelHeight)});
  const normalize=(x,y,width,height,panelWidth,panelHeight)=>({x:clamp(x/Math.max(1,width-panelWidth),0,1),y:clamp(y/Math.max(1,height-panelHeight),0,1)});
  const model={clamp,position,normalize};if(typeof module!=='undefined')module.exports=model;else root.FlowPanelModel=model;
})(globalThis);
