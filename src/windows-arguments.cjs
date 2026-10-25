// Quote one CommandLineToArgvW argument without changing spaces or Unicode.
function quoteWindowsArgument(value){return '"'+String(value).replace(/(\\*)"/g,'$1$1\\"').replace(/(\\+)$/,'$1$1')+'"';}
module.exports={quoteWindowsArgument};
