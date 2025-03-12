/*
  # Financial Transactions Schema

  1. New Tables
    - `financial_transactions`
      - `id` (uuid, primary key)
      - `date` (timestamptz)
      - `amount` (integer)
      - `type` (text: 'income' | 'expense')
      - `category` (text)
      - `description` (text)
      - `recipient` (text, optional)
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `bank_balance_updates`
      - `id` (uuid, primary key)
      - `amount` (integer)
      - `updated_at` (timestamptz)
      - `updated_by` (uuid, references profiles)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users based on role
*/

-- Create financial transactions table
CREATE TABLE IF NOT EXISTS financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date timestamptz NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  recipient text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT financial_transactions_type_check CHECK (type IN ('income', 'expense')),
  CONSTRAINT financial_transactions_category_check CHECK (
    category IN (
      'donation',
      'reimbursement',
      'other_income',
      'loan',
      'event_expense',
      'project_expense',
      'prefinancing',
      'donation_expense',
      'other_expense'
    )
  )
);

-- Create bank balance updates table
CREATE TABLE IF NOT EXISTS bank_balance_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount integer NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_balance_updates ENABLE ROW LEVEL SECURITY;

-- Create policies for financial_transactions
CREATE POLICY "Anyone can view financial transactions"
  ON financial_transactions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins and intermediates can insert transactions"
  ON financial_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
    )
  );

CREATE POLICY "Super admins can delete transactions"
  ON financial_transactions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Create policies for bank_balance_updates
CREATE POLICY "Anyone can view bank balance updates"
  ON bank_balance_updates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins and intermediates can update bank balance"
  ON bank_balance_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR profiles.role = 'intermediate')
    )
  );

-- Create updated_at triggers
CREATE TRIGGER update_financial_transactions_updated_at
  BEFORE UPDATE ON financial_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();