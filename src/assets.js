export const shipSVG2 = `
<svg xmlns="http://www.w3.org/2000/svg" width="62" height="62"> <polygon points="34,12 26,30 28,32 32,30 30,32 30,32 34,30 34,32 36,32 36,30 38,32 38,32 38,30 42,32 44,32" fill=grey /> </svg>
`;

export const shipSVG3 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="62" height="62"> <path d="m16 1-5 14-9 10 3 2 3-2 4 2v3l1.6-1.1.5 1.2L16 30h1.9l.5-1.1L20 30v-3l4-2 3 2 3-2-9-10z" style="fill:hsl(200 20% 20%)"/> </svg>
`;

export const shipSVG = `
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1110" height="1110" viewBox="817.5,362.5,110,110"><g id="document" fill="#ffffff" fill-rule="nonzero" stroke="#000000" stroke-width="0" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" ><rect x="5202.27273" y="1647.72727" transform="scale(0.15714,0.22)" width="700" height="500" id="Shape 1 1" vector-effect="non-scaling-stroke"/></g><g fill="white" fill-rule="nonzero" stroke="#000000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10"><g id="stage"><g id="layer1 1"><path d="M821.60345,466.98276l41.81819,-87.88263l7.42319,-15.60013l52.65517,102.79311l-51.44828,-27.18965z" id="Path 3"/><path d="M868.01726,412.38048l6.75056,-0.02159l5.04149,20.55973l-16.36421,0.3818z" id="Path 3"/><path d="M870.87479,369.24255l0.64607,43.36469" id="Path 3"/><path d="M871.85375,460.37879l5.79776,-5.75343l-12.15152,-0.03429z" id="Path 3"/><path d="M874.15248,426.12645" id="Path 3"/><path d="M849.41412,447.8546l21.46448,-78.27112l24.75585,78.18049" id="Path 3"/><path d="M822.40716,465.29373l49.43258,-31.91997l51.00257,31.63544" id="Path 1 1"/><path d="M863.26579,444.29662l2.23421,7.02571h12l2.14622,-8.20529" id="Path 3"/><path d="M864.93246,450.72458l-5.90909,3.33333l-2.87879,-2.12121l1.61797,-4.9366" id="Path 3"/><path d="M878.65151,450.52932l5.90909,3.33333l2.87879,-2.12121l-1.61797,-4.9366" id="Path 2 1"/><path d="M871.75064,438.9064l-0.30303,12.41593" id="Path 3"/><path d="M872.81125,411.78519" id="Path 3"/></g></g></g></svg>
`;

export function loadSVGString(svgString) {
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${svgString}`;
    return img;
}

export function drawSVGImg(ctx, img, scale = 1) {
    ctx.rotate((90 * Math.PI) / 180);
    ctx.scale(0.25 * scale, 0.25 * scale);
    ctx.translate(-154, -206);
    ctx.drawImage(img, 1, 1, 300, 300);
    ctx.translate(154, 206);
    ctx.scale(4, 4);
    ctx.rotate((-90 * Math.PI) / 180);
}
