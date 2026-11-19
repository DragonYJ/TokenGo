export const palette={common:['#a8bdcc','#435568'],uncommon:['#7bdbc5','#287969'],rare:['#7fb8ff','#365ba8'],epic:['#c7a2ff','#784ca8'],legendary:['#ffe3a1','#a7752b']};
export const rarityNames={common:'普通',uncommon:'精良',rare:'稀有',epic:'史诗',legendary:'传说'};
const paths={
 trophy:'M21 17h22v13c0 9-5 14-11 14s-11-5-11-14V17Zm0 4H13v7c0 7 4 10 10 10m20-17h8v7c0 7-4 10-10 10M32 44v9m-9 0h18',
 spark:'m35 10-17 25h12l-1 19 17-26H34l1-18Z',
 gem:'m12 25 10-11h20l10 11-20 28L12 25Zm0 0h40M22 14l10 39 10-39',
 hourglass:'M19 13h26M19 51h26M22 13v9c0 7 20 13 20 20v9M42 13v9c0 7-20 13-20 20v9M24 44h16M27 20h10',
 flame:'M34 10c4 13-3 15 4 24 4-3 6-7 5-10 15 15 6 31-11 31-16 0-23-15-13-27 0 7 4 9 6 10-5-16 10-19 9-28Z',
 compass:'M32 9a23 23 0 1 0 0 46 23 23 0 0 0 0-46Zm10 13-6 14-14 6 6-14 14-6Z',
 flag:'M19 54V12m0 2c12-8 17 8 29 0v22c-12 8-17-8-29 0',
 orbit:'M32 23a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM13 19c5-8 17-4 29 7s15 21 9 25-20-3-29-15S7 19 13 19Zm38-6c8 5 4 17-7 29S23 57 19 51s3-20 15-29 17-15 17-9Z',
 anvil:'M12 22h40v7H40l-3 10v7h9v6H18v-6h9v-7l-3-10H16l-4-7ZM24 14h16v8',
 book:'M32 18c-8-7-15-7-22-5v35c8-2 15-1 22 5 7-6 14-7 22-5V13c-7-2-14-2-22 5Zm0 0v35',
 feather:'M15 51 43 16m-19 9c15-20 30-13 30-13s3 23-17 31l-17 2 4-20Zm5 10h15',
 sun:'M32 20a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm0-13v6m0 38v6M7 32h6m38 0h6M14 14l5 5m26 26 5 5M14 50l5-5m26-26 5-5',
 link:'m27 38-5 5a9 9 0 0 1-13-13l11-11a9 9 0 0 1 13 0m4 7 5-5a9 9 0 0 1 13 13L44 45a9 9 0 0 1-13 0m-9-3 20-20',
 terminal:'M9 14h46v36H9V14Zm9 11 8 7-8 7m15 1h11',
 branch:'M20 12v40m0-20c23 0 24-10 24-18M20 9a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 37a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm24-37a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',
 shield:'m32 9 20 8v15c0 13-20 23-20 23S12 45 12 32V17L32 9Zm-9 22 6 6 13-14',
 box:'m32 10 22 12v27L32 59 10 49V22l22-12Zm-22 12 22 12 22-12M32 34v25M21 16l22 12',
 globe:'M32 9a23 23 0 1 0 0 46 23 23 0 0 0 0-46Zm0 0c-14 13-14 33 0 46 14-13 14-33 0-46ZM10 25h44M10 39h44',
 film:'M10 14h44v38H10V14Zm8 0v38m28-38v38M10 24h8m-8 17h8m28-17h8m-8 17h8M27 24l12 9-12 8V24Z',
 music:'M26 43V17l23-5v26M26 23l23-5M19 39a7 6 0 1 0 0 12 7 6 0 0 0 0-12Zm23-5a7 6 0 1 0 0 12 7 6 0 0 0 0-12Z',
 grid:'M11 12h42v40H11V12Zm0 13h42M11 39h42M25 12v40m14-40v40',
 rocket:'M23 39c-4-18 13-28 29-28 0 16-10 33-28 29Zm10-15a5 5 0 1 0 10 0 5 5 0 0 0-10 0ZM23 24l-12 4-3 11 15-1m16 2-4 13-11 3 1-16M17 45l-7 8',
 lock:'M20 28v-8a12 12 0 0 1 24 0v8M14 28h36v28H14V28Zm18 10v8'
};
export function glyph(icon='trophy',color='currentColor') {return `<svg viewBox="0 0 64 64" fill="none" stroke="${color}" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[icon]||paths.trophy}"/></svg>`;}
export function badge(icon='trophy',rarity='rare',locked=false){
 const [light,dark]=palette[rarity]||palette.rare;
 const color=locked?'#647183':light,shade=locked?'#263141':dark;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 156" fill="none" aria-hidden="true"><path d="m32 112-4 38 25-12 17 11 17-11 25 12-4-38" fill="${shade}" stroke="${color}" stroke-opacity=".25"/><path d="M70 5 123 34v61l-53 32-53-32V34L70 5Z" fill="${shade}" stroke="${color}" stroke-width="2"/><path d="m70 13 46 26v52l-46 28-46-28V39l46-26Z" fill="#111c2e" stroke="${color}" stroke-opacity=".4"/><path d="m70 21 38 22v44l-38 23-38-23V43l38-22Z" fill="${shade}" fill-opacity=".2"/><path d="m31 42 39-23 39 23M31 87l39 24 39-24" stroke="${color}" stroke-opacity=".3"/><g transform="translate(38 34)" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[locked?'lock':icon]||paths.trophy}"/></g><path d="m70 116 3 5-3 5-3-5 3-5Z" fill="${color}"/></svg>`;
}
