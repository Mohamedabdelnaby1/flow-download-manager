/* The stored preference stays 'system'; the resolved palette is local to each window. */
(function(root){
  const media=root.matchMedia('(prefers-color-scheme: dark)');
  const apply=()=>{
    const preference=root.flowAppearancePreference||'system';
    const dark=preference==='dark'||preference==='amoled'||preference==='system'&&media.matches;
    document.body.classList.toggle('dark',dark);
    document.body.classList.toggle('amoled',preference==='amoled');
    document.documentElement.style.colorScheme=dark?'dark':'light';
    document.documentElement.dataset.theme=preference;
    document.documentElement.dataset.resolvedTheme=preference==='amoled'?'amoled':dark?'dark':'light';
    root.FlowWorkspaceAppearance?.reapply?.();
  };
  root.applyAppearance=preference=>{root.flowAppearancePreference=preference;apply();};
  media.addEventListener('change',apply);
  apply();
})(window);
