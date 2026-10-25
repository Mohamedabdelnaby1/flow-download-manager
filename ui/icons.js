const paths={
 pin:'M16 3l5 5-4 1-3 5v4l-3-3-6 6m6-6-5-5h4l5-3z',
 arrow:'M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4',plus:'M12 5v14M5 12h14',search:'m21 21-4.5-4.5M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0',
 grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',play:'m8 4 12 8-12 8z',pause:'M8 4v16M16 4v16',stop:'M5 5h14v14H5z',check:'m5 12 4 4L19 6',chevron:'m9 5 7 7-7 7',down:'m6 9 6 6 6-6',
 clock:'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',folder:'M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v10H3z',file:'M14 2H4v20h16V8zM14 2v6h6M8 13h8M8 17h5',
 archive:'M3 3h18v5H3zM5 8v13h14V8M10 12h4',music:'M9 18V5l12-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3ZM21 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3Z',video:'M3 5h18v14H3zM9 8l7 4-7 4z',code:'m8 6-6 6 6 6m8-12 6 6-6 6m-5-15-2 18',
 globe:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M2 12h20M12 2c6 6 6 14 0 20-6-6-6-14 0-20',link:'m10 13 4-4M9 15l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 3 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0',
 settings:'m10 2 4 0 1 3 3 2 3 0 2 4-2 2v3l1 3-4 2-2-2h-3l-3 1-2-4 2-2v-3L7 4zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
 sun:'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2',moon:'M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10',
 more:'M5 11v2m7-2v2m7-2v2',trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',x:'m6 6 12 12M6 18 18 6',upload:'M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5',
 database:'M21 5c0 2-4 3-9 3S3 7 3 5s4-3 9-3 9 1 9 3ZM3 5v7c0 2 4 3 9 3s9-1 9-3V5M3 12v7c0 2 4 3 9 3s9-1 9-3v-7',shield:'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6zM8 11l3 3 5-5',
 activity:'M2 12h5l3-9 4 18 3-9h5',bolt:'m13 2-9 12h7l-1 8 10-12h-7z',refresh:'M20 7a9 9 0 1 0 1 9M20 2v6h-6',info:'M12 10v7m0-10v.1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 cloud:'M6 18a5 5 0 0 1-1-10 7 7 0 0 1 13-1 5 5 0 0 1 0 11M12 11v9m-4-4 4 4 4-4',copy:'M9 9h12v12H9zM15 9V3H3v12h6',list:'M8 6h13M8 12h13M8 18h13M3 6h.1M3 12h.1M3 18h.1',
 bell:'M5 17h14l-2-3V8a5 5 0 0 0-10 0v6zM10 21h4',external:'M14 3h7v7m0-7L10 14M10 3H3v18h18v-7',sort:'M8 3v18m-4-4 4 4 4-4M16 3v18m-4-14 4-4 4 4',terminal:'m4 6 6 6-6 6m9 0h7',headphones:'M3 14v-3a9 9 0 0 1 18 0v3M3 12h4v9H3zM17 12h4v9h-4z',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',volume:'M11 3 5 8H2v8h3l6 5zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',menu:'M3 6h18M3 12h18M3 18h18'
};
function icon(name,cls=''){return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.file}"/></svg>`;}
