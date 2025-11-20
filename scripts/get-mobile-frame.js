const https = require('https');

const FIGMA_API_KEY = process.env.FIGMA_API_KEY || '';
const FILE_KEY = 'GlAxWG5CIynQR60Tgupefx';

// Mobile frame appears to be Frame 1:2 based on the device preset
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
      
      function extractMobileSpecs(node, specs = {}) {
        if (node.type === 'FRAME') {
          const bbox = node.absoluteBoundingBox || {};
          const name = node.name || '';
          
          if (name.includes('Frame 1') && !specs.container) {
            specs.container = {
              padding: {
                left: node.paddingLeft || 0,
                right: node.paddingRight || 0,
                top: node.paddingTop || 0,
                bottom: node.paddingBottom || 0
              },
              spacing: node.itemSpacing || 0
            };
          }
          
          if (name.includes('Frame 2') && !specs.orderDetails) {
            specs.orderDetails = {
              padding: {
                left: node.paddingLeft || 0,
                right: node.paddingRight || 0,
                top: node.paddingTop || 0,
                bottom: node.paddingBottom || 0
              },
              spacing: node.itemSpacing || 0
            };
          }
          
          if (name.includes('Frame 3') && name.includes('Order items') && !specs.orderItems) {
            specs.orderItems = {
              padding: {
                left: node.paddingLeft || 0,
                right: node.paddingRight || 0,
                top: node.paddingTop || 0,
                bottom: node.paddingBottom || 0
              },
              spacing: node.itemSpacing || 0
            };
          }
          
          if (name.includes('Frame 8') && !specs.itemRow) {
            specs.itemRow = {
              gap: node.itemSpacing || 0,
              align: node.counterAxisAlignItems || ''
            };
          }
          
          if (name.includes('Frame 7') && !specs.image) {
            const bbox = node.absoluteBoundingBox || {};
            specs.image = {
              width: bbox.width || 0,
              height: bbox.height || 0,
              padding: {
                left: node.paddingLeft || 0,
                right: node.paddingRight || 0,
                top: node.paddingTop || 0,
                bottom: node.paddingBottom || 0
              }
            };
          }
        }
        
        if (node.type === 'TEXT') {
          const name = node.name || '';
          const style = node.style || {};
          
          if (name.includes('Order Place') && !specs.heading) {
            specs.heading = {
              fontSize: style.fontSize || 0,
              fontWeight: style.fontWeight || 0,
              lineHeight: style.lineHeightPx || 0,
              letterSpacing: style.letterSpacing || 0
            };
          }
          
          if (name.includes('Product Title') && !specs.productTitle) {
            specs.productTitle = {
              fontSize: style.fontSize || 0,
              fontWeight: style.fontWeight || 0,
              lineHeight: style.lineHeightPx || 0
            };
          }
          
          if (name.includes('Price :') && !specs.price) {
            specs.price = {
              fontSize: style.fontSize || 0,
              fontWeight: style.fontWeight || 0,
              lineHeight: style.lineHeightPx || 0
            };
          }
          
          if (name.includes('Date :') && !specs.date) {
            specs.date = {
              fontSize: style.fontSize || 0,
              fontWeight: style.fontWeight || 0,
              lineHeight: style.lineHeightPx || 0
            };
          }
        }
        
        if (node.children && Array.isArray(node.children)) {
          node.children.forEach(child => {
            extractMobileSpecs(child, specs);
          });
        }
        
        return specs;
      }
      
      const specs = extractMobileSpecs(node);
      console.log('\n=== MOBILE FRAME SPECIFICATIONS ===\n');
      console.log(JSON.stringify(specs, null, 2));
      
    } catch (error) {
      console.error('Error:', error.message);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.end();

