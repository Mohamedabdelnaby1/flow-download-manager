function editMenu(params,language='en'){
 const text=(en,ar)=>language==='ar'?ar:en,flags=params.editFlags||{};
 const entries=params.isEditable?[
  {label:text('Undo','تراجع'),role:'undo',enabled:!!flags.canUndo},
  {label:text('Redo','إعادة'),role:'redo',enabled:!!flags.canRedo},{type:'separator'},
  {label:text('Cut','قص'),role:'cut',enabled:!!flags.canCut},
  {label:text('Copy','نسخ'),role:'copy',enabled:!!flags.canCopy},
  {label:text('Paste','لصق'),role:'paste',enabled:!!flags.canPaste},{type:'separator'},
  {label:text('Select all','تحديد الكل'),role:'selectAll',enabled:flags.canSelectAll!==false}
 ]:params.selectionText?[{label:text('Copy','نسخ'),role:'copy',enabled:true}]:[];
 return entries;
}
module.exports={editMenu};
