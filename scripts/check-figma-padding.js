const https = require('https');

const FIGMA_API_KEY = process.env.FIGMA_API_KEY || '';
const FILE_KEY = 'GlAxWG5CIynQR60Tgupefx';

function getLayoutInfo(node, frames = [], path = '') {
  if (node.type === 'FRAME') {
    const bbox = node.absoluteBoundingBox || {};
    const padding = {
      left: node.paddingLeft || 0,
      right: node.paddingRight || 0,
      top: node.paddingTop || 0,
      bottom: node.paddingBottom || 0
    };
    const spacing = node.itemSpacing || 0;
    const layout = node.layoutMode || 'NONE';
    const align = node.counterAxisAlignItems || '';
    const primaryAlign = node.primaryAxisAlignItems || '';
    
    frames.push({
      name: node.name || '',
      path: path,
      x: bbox.x || 0,
      y: bbox.y || 0,
      width: bbox.width || 0,
      height: bbox.height || 0,
      padding: padding,
      spacing: spacing,
      layout: layout,
      align: align,
      primaryAlign: primaryAlign
    });
  }
  
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => {
      getLayoutInfo(child, frames, path ? `${path}/${node.name}` : node.name);
    });
  }
  
  return frames;
}

const options = {
  hostname: 'api.figma.com',
  path: `/v1/files/${FILE_KEY}/nodes?ids=1:2`,
  method: 'GET',
  headers: {
    'X-Figma-Token': FIGMA_API_KEY
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      const node = jsonData.nodes['1:2'].document;
      const frames = getLayoutInfo(node);
      
      console.log('\n=== FRAME PADDING, SPACING & ALIGNMENT ===\n');
      frames.forEach(f => {
        if (f.name) {
          console.log(`Frame: ${f.name}`);
          console.log(`  Position: x=${f.x}, y=${f.y}`);
          console.log(`  Size: ${f.width}x${f.height}px`);
          if (f.padding.left || f.padding.right || f.padding.top || f.padding.bottom) {
            console.log(`  Padding: L:${f.padding.left} R:${f.padding.right} T:${f.padding.top} B:${f.padding.bottom}px`);
          }
          if (f.spacing) {
            console.log(`  Item Spacing: ${f.spacing}px`);
          }
          if (f.layout !== 'NONE') {
            console.log(`  Layout: ${f.layout}`);
            if (f.align) console.log(`  Counter Axis Align: ${f.align}`);
            if (f.primaryAlign) console.log(`  Primary Axis Align: ${f.primaryAlign}`);
          }
          console.log();
        }
      });
    } catch (error) {
      console.error('Error:', error.message);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.end();

