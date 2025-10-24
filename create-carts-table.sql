-- Create missing carts table
CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id);

-- Enable RLS
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

-- Create policies for carts table
CREATE POLICY "Users can view their own cart" ON carts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cart" ON carts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart" ON carts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart" ON carts
  FOR DELETE USING (auth.uid() = user_id);
