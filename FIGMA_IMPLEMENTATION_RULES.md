# Figma Implementation Rules

## General Rules for Converting Figma Designs to Code

### 1. Placeholder Text Replacement
**Rule**: When you see placeholder text like `xxxxx`, `XXXXX`, `XXXXXXXX`, etc. in Figma designs, replace them with actual values from the database/order data.

**Examples**:
- `ORD-ID:XXXXX` → `ORD-ID:{order.order_number}`
- `XXXXXXXX` (for date) → `{formatDate(order.created_at)}`
- `XXXXX` (for payment method) → `{getPaymentMethodLabel(order.payment_method)}`
- `xxxxx` (for price) → `₹{item.total_price.toFixed(2)}`
- `XXXXXXX` (for status) → `{order.status}`

### 2. Title/Product Name Replacement
**Rule**: Where Figma uses "Title" or "title" as placeholder text, replace it with the actual product name from the database.

**Examples**:
- `Title` → `{item.product_name}`
- `title` → `{product.name}`

### 3. Implementation Checklist
When implementing a Figma design:

- [ ] Identify all placeholder text (`xxxxx`, `XXXXX`, `Title`, etc.)
- [ ] Map each placeholder to the correct data source:
  - Order data (order number, date, status, payment method)
  - Product data (product name, price, image)
  - User data (name, address, phone)
- [ ] Replace placeholders with actual dynamic values
- [ ] Ensure proper formatting (dates, currency, etc.)
- [ ] Test with real data to verify replacements work correctly

### 4. Common Placeholder Patterns

| Figma Placeholder | Database Field | Example Replacement |
|------------------|----------------|---------------------|
| `XXXXX` | Order Number | `{order.order_number}` |
| `XXXXXXXX` | Date | `{formatDate(order.created_at)}` |
| `xxxxx` | Price | `₹{item.total_price.toFixed(2)}` |
| `Title` | Product Name | `{item.product_name}` |
| `title` | Product Name | `{product.name}` |
| `XXXXXXX` | Status | `{order.status}` |

### 5. Notes
- Always use proper formatting functions for dates, currency, etc.
- Ensure null/undefined checks before displaying values
- Use fallback values when data might be missing
- Maintain consistent formatting across the application

