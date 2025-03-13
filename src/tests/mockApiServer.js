// Serveur Express simple pour simuler l'API locale
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Base de données en mémoire pour les tests
const db = {
  members: [
    {
      id: '1',
      first_name: 'Jean',
      last_name: 'Dupont',
      email: 'jean.dupont@example.com',
      role: 'super_admin',
      status: 'active',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z'
    },
    {
      id: '2',
      first_name: 'Marie',
      last_name: 'Martin',
      email: 'marie.martin@example.com',
      role: 'standard',
      status: 'active',
      created_at: '2025-01-02T00:00:00.000Z',
      updated_at: '2025-01-02T00:00:00.000Z'
    }
  ],
  financial_transactions: [
    {
      id: '1',
      date: '2025-03-01T00:00:00.000Z',
      amount: 1000,
      type: 'income',
      category: 'Cotisations',
      description: 'Cotisations mensuelles',
      created_by: '1',
      created_at: '2025-03-01T00:00:00.000Z',
      updated_at: '2025-03-01T00:00:00.000Z'
    },
    {
      id: '2',
      date: '2025-03-05T00:00:00.000Z',
      amount: 500,
      type: 'expense',
      category: 'Événement',
      description: 'Dépenses pour la fête familiale',
      created_by: '1',
      created_at: '2025-03-05T00:00:00.000Z',
      updated_at: '2025-03-05T00:00:00.000Z'
    }
  ],
  bank_balance: [
    {
      id: '1',
      amount: 5000,
      updated_at: '2025-03-10T00:00:00.000Z',
      updated_by: '1'
    }
  ],
  audit_logs: []
};

// Middleware d'authentification simulé
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  
  // Dans un environnement de test, nous acceptons n'importe quel token
  next();
};

// Routes pour les membres
app.get('/api/members', authMiddleware, (req, res) => {
  res.json(db.members);
});

app.get('/api/members/:id', authMiddleware, (req, res) => {
  const member = db.members.find(m => m.id === req.params.id);
  
  if (!member) {
    return res.status(404).json({ error: 'Membre non trouvé' });
  }
  
  res.json(member);
});

app.post('/api/members', authMiddleware, (req, res) => {
  const { name, email, role, status } = req.body;
  
  const newMember = {
    id: uuidv4(),
    first_name: name.split(' ')[0],
    last_name: name.split(' ').slice(1).join(' '),
    email,
    role,
    status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  db.members.push(newMember);
  
  // Ajouter un log d'audit
  db.audit_logs.push({
    id: uuidv4(),
    action: 'member_create',
    user_id: req.body.created_by || 'system',
    target_id: newMember.id,
    details: { message: `Nouveau membre créé: ${newMember.first_name} ${newMember.last_name}` },
    created_at: new Date().toISOString()
  });
  
  res.status(201).json(newMember);
});

app.put('/api/members/:id', authMiddleware, (req, res) => {
  const memberIndex = db.members.findIndex(m => m.id === req.params.id);
  
  if (memberIndex === -1) {
    return res.status(404).json({ error: 'Membre non trouvé' });
  }
  
  const updatedMember = {
    ...db.members[memberIndex],
    ...req.body,
    updated_at: new Date().toISOString()
  };
  
  db.members[memberIndex] = updatedMember;
  
  // Ajouter un log d'audit
  db.audit_logs.push({
    id: uuidv4(),
    action: 'member_update',
    user_id: req.body.updated_by || 'system',
    target_id: updatedMember.id,
    details: { message: `Membre mis à jour: ${updatedMember.first_name} ${updatedMember.last_name}` },
    created_at: new Date().toISOString()
  });
  
  res.json(updatedMember);
});

app.delete('/api/members/:id', authMiddleware, (req, res) => {
  const memberIndex = db.members.findIndex(m => m.id === req.params.id);
  
  if (memberIndex === -1) {
    return res.status(404).json({ error: 'Membre non trouvé' });
  }
  
  const deletedMember = db.members[memberIndex];
  db.members.splice(memberIndex, 1);
  
  // Ajouter un log d'audit
  db.audit_logs.push({
    id: uuidv4(),
    action: 'member_delete',
    user_id: req.query.user_id || 'system',
    target_id: deletedMember.id,
    details: { message: `Membre supprimé: ${deletedMember.first_name} ${deletedMember.last_name}` },
    created_at: new Date().toISOString()
  });
  
  res.json({ success: true });
});

// Routes pour les transactions financières
app.get('/api/financial/transactions', authMiddleware, (req, res) => {
  let transactions = [...db.financial_transactions];
  
  // Filtrage par type
  if (req.query.type) {
    transactions = transactions.filter(t => t.type === req.query.type);
  }
  
  // Filtrage par catégorie
  if (req.query.category) {
    transactions = transactions.filter(t => t.category === req.query.category);
  }
  
  // Filtrage par date de début
  if (req.query.startDate) {
    transactions = transactions.filter(t => new Date(t.date) >= new Date(req.query.startDate));
  }
  
  // Filtrage par date de fin
  if (req.query.endDate) {
    transactions = transactions.filter(t => new Date(t.date) <= new Date(req.query.endDate));
  }
  
  res.json(transactions);
});

app.post('/api/financial/transactions', authMiddleware, (req, res) => {
  const { date, amount, type, category, description, created_by } = req.body;
  
  const newTransaction = {
    id: uuidv4(),
    date,
    amount,
    type,
    category,
    description,
    created_by,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  db.financial_transactions.push(newTransaction);
  
  // Ajouter un log d'audit
  db.audit_logs.push({
    id: uuidv4(),
    action: 'financial_transaction_create',
    user_id: created_by || 'system',
    target_id: newTransaction.id,
    details: { 
      type, 
      amount, 
      category,
      message: `Nouvelle transaction financière créée: ${type} de ${amount}€ dans la catégorie ${category}` 
    },
    created_at: new Date().toISOString()
  });
  
  res.status(201).json(newTransaction);
});

app.delete('/api/financial/transactions/:id', authMiddleware, (req, res) => {
  const transactionIndex = db.financial_transactions.findIndex(t => t.id === req.params.id);
  
  if (transactionIndex === -1) {
    return res.status(404).json({ error: 'Transaction non trouvée' });
  }
  
  const deletedTransaction = db.financial_transactions[transactionIndex];
  db.financial_transactions.splice(transactionIndex, 1);
  
  // Ajouter un log d'audit
  db.audit_logs.push({
    id: uuidv4(),
    action: 'financial_transaction_delete',
    user_id: req.query.user_id || 'system',
    target_id: deletedTransaction.id,
    details: { 
      message: `Transaction financière supprimée: ${deletedTransaction.type} de ${deletedTransaction.amount}€` 
    },
    created_at: new Date().toISOString()
  });
  
  res.json({ success: true });
});

// Routes pour le solde bancaire
app.get('/api/financial/bank-balance/latest', authMiddleware, (req, res) => {
  if (db.bank_balance.length === 0) {
    return res.json({ amount: 0, updated_at: null });
  }
  
  // Trier par date de mise à jour décroissante et prendre le premier
  const latestBalance = db.bank_balance.sort((a, b) => 
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )[0];
  
  res.json(latestBalance);
});

app.post('/api/financial/bank-balance', authMiddleware, (req, res) => {
  const { amount, updated_by } = req.body;
  
  const newBalance = {
    id: uuidv4(),
    amount,
    updated_by,
    updated_at: new Date().toISOString()
  };
  
  db.bank_balance.push(newBalance);
  
  // Ajouter un log d'audit
  db.audit_logs.push({
    id: uuidv4(),
    action: 'bank_balance_update',
    user_id: updated_by || 'system',
    target_id: newBalance.id,
    details: { 
      amount,
      message: `Solde bancaire mis à jour: ${amount}€` 
    },
    created_at: new Date().toISOString()
  });
  
  res.status(201).json(newBalance);
});

// Route pour le calcul du solde de trésorerie
app.get('/api/financial/cash-balance', authMiddleware, (req, res) => {
  // Calculer le total des contributions (simulé)
  const totalContributions = 3000;
  
  // Calculer le total des revenus manuels
  const totalManualIncome = db.financial_transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  // Calculer le total des dépenses
  const totalExpenses = db.financial_transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  // Calculer le solde final
  const finalBalance = totalContributions + totalManualIncome - totalExpenses;
  
  res.json({
    totalBalance: finalBalance,
    totalContributions,
    totalManualIncome,
    totalExpenses
  });
});

// Routes pour les logs d'audit
app.post('/api/audit', (req, res) => {
  const { action, user_id, target_id, details } = req.body;
  
  const newLog = {
    id: uuidv4(),
    action,
    user_id,
    target_id,
    details,
    created_at: new Date().toISOString()
  };
  
  db.audit_logs.push(newLog);
  
  res.status(201).json(newLog);
});

// Route spécifique pour les logs d'audit (endpoint utilisé par la fonction logAuditEvent)
app.post('/api/audit/logs', (req, res) => {
  const { action, user_id, target_id, details, created_at } = req.body;
  
  const newLog = {
    id: uuidv4(),
    action,
    user_id,
    target_id,
    details,
    created_at: created_at || new Date().toISOString()
  };
  
  db.audit_logs.push(newLog);
  
  res.status(201).json(newLog);
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur API de test démarré sur http://localhost:${PORT}`);
});
