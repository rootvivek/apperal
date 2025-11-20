const https = require('https');

const FIGMA_API_KEY = process.env.FIGMA_API_KEY || '';
const FILE_KEY = 'GlAxWG5CIynQR60Tgupefx';

// Check Frame 1:2 which appears to be the mobile frame
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
      
      function extractSpecs(node, specs = {}, path = '') {
        const bbox = node.absoluteBoundingBox || {};
        const name = node.name || '';
        const fullPath = path ? `${path}/${name}` : name;
        
        // Container specs
        if (name === 'Frame 1' && node.type === 'FRAME') {
          specs.container = {
            padding: {
              left: node.paddingLeft || 0,
              right: node.paddingRight || 0,
              top: node.paddingTop || 0,
              bottom: node.paddingBottom || 0
            },
            spacing: node.itemSpacing || 0,
            width: bbox.width || 0
          };
        }
        
        // Success icon
        if (name.includes('image-') && node.type === 'RECTANGLE') {
          specs.successIcon = {
            width: bbox.width || 0,
            height: bbox.height || 0
          };
        }
        
        // Heading
        if (name === 'Order Place Successfully!' && node.type === 'TEXT') {
          const style = node.style || {};
          specs.heading = {
            fontSize: style.fontSize || 0,
            fontWeight: style.fontWeight || 0,
            lineHeight: style.lineHeightPx || 0,
            letterSpacing: style.letterSpacing || 0,
            fontFamily: style.fontFamily || ''
          };
        }
        
        // Thank you message
        if (name.includes('Thanks you for your order') && node.type === 'TEXT') {
          const style = node.style || {};
          specs.thankYouMessage = {
            fontSize: style.fontSize || 0,
            fontWeight: style.fontWeight || 0,
            lineHeight: style.lineHeightPx || 0,
            fontFamily: style.fontFamily || ''
          };
        }
        
        // Order Details Card
        if (name === 'Frame 2' && node.type === 'FRAME') {
          specs.orderDetailsCard = {
            padding: {
              left: node.paddingLeft || 0,
              right: node.paddingRight || 0,
              top: node.paddingTop || 0,
              bottom: node.paddingBottom || 0
            },
            spacing: node.itemSpacing || 0
          };
        }
        
        // Order Details Heading
        if (name === 'Order Details' && node.type === 'TEXT') {
          const style = node.style || {};
          specs.orderDetailsHeading = {
            fontSize: style.fontSize || 0,
            fontWeight: style.fontWeight || 0,
            lineHeight: style.lineHeightPx || 0,
            letterSpacing: style.letterSpacing || 0,
            fontFamily: style.fontFamily || ''
          };
        }
        
        // Order Items Card
        if (name === 'Frame 3' && node.type === 'FRAME' && bbox.width < 500) {
          specs.orderItemsCard = {
            padding: {
              left: node.paddingLeft || 0,
              right: node.paddingRight || 0,
              top: node.paddingTop || 0,
              bottom: node.paddingBottom || 0
            },
            spacing: node.itemSpacing || 0
          };
        }
        
        // Order Items Heading
        if (name === 'Order items' && node.type === 'TEXT') {
          const style = node.style || {};
          specs.orderItemsHeading = {
            fontSize: style.fontSize || 0,
            fontWeight: style.fontWeight || 0,
            lineHeight: style.lineHeightPx || 0,
            letterSpacing: style.letterSpacing || 0,
            fontFamily: style.fontFamily || ''
          };
        }
        
        // Product Image (Frame 7)
        if (name === 'Frame 7' && node.type === 'FRAME' && bbox.width < 100) {
          specs.productImage = {
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
        
        // Frame 8 (item row)
        if (name === 'Frame 8' && node.type === 'FRAME' && bbox.width < 500) {
          specs.itemRow = {
            gap: node.itemSpacing || 0,
            align: node.counterAxisAlignItems || ''
          };
        }
        
        // Product Title
        if (name === 'Product Title' && node.type === 'TEXT') {
          const style = node.style || {};
          specs.productTitle = {
            fontSize: style.fontSize || 0,
            fontWeight: style.fontWeight || 0,
            lineHeight: style.lineHeightPx || 0,
            fontFamily: style.fontFamily || ''
          };
        }
        
        // Price
        if (name.includes('Price :') && node.type === 'TEXT') {
          const style = node.style || {};
          specs.price = {
            fontSize: style.fontSize || 0,
            fontWeight: style.fontWeight || 0,
            lineHeight: style.lineHeightPx || 0,
            fontFamily: style.fontFamily || ''
          };
        }
        
        // Date
        if (name.includes('Date :') && node.type === 'TEXT') {
          const style = node.style || {};
          specs.date = {
            fontSize: style.fontSize || 0,
            fontWeight: style.fontWeight || 0,
            lineHeight: style.lineHeightPx || 0,
            fontFamily: style.fontFamily || ''
          };
        }
        
        // Payment Method
        if (name.includes('Cash on') && node.type === 'TEXT') {
          const style = node.style || {};
          specs.paymentMethod = {
            fontSize: style.fontSize || 0,
            fontWeight: style.fontWeight || 0,
            lineHeight: style.lineHeightPx || 0,
            fontFamily: style.fontFamily || ''
          };
        }
        
        // Buttons
        if (name === 'button' && node.type === 'INSTANCE') {
          const bbox = node.absoluteBoundingBox || {};
          if (!specs.button) {
            specs.button = {
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
        
        if (node.children && Array.isArray(node.children)) {
          node.children.forEach(child => {
            extractSpecs(child, specs, fullPath);
          });
        }
        
        return specs;
      }
      
      const specs = extractSpecs(node);
      console.log('\n=== MOBILE FRAME SPECIFICATIONS (Frame 1:2) ===\n');
      console.log(JSON.stringify(specs, null, 2));
      
    } catch (error) {
      console.error('Error:', error.message);
      console.error(error.stack);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.end();

