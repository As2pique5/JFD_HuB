import request from 'supertest';
import { createTestApp, generateTestToken, createAuthenticatedAgent } from '../utils/testApp';
import { initTestDb, cleanTestDb, closeTestDb, testPool } from '../utils/testDb';
import { v4 as uuidv4 } from 'uuid';

describe('Family API Integration Tests', () => {
  let app: any;
  let adminToken: string;
  let memberToken: string;
  
  // Données de test
  const testFamilyMember1 = {
    first_name: 'Jean',
    last_name: 'Dupont',
    birth_date: '1980-01-01',
    gender: 'male',
    bio: 'Membre fondateur de la famille'
  };
  
  const testFamilyMember2 = {
    first_name: 'Marie',
    last_name: 'Dupont',
    birth_date: '1982-05-15',
    gender: 'female',
    bio: 'Épouse de Jean'
  };
  
  const testFamilyMember3 = {
    first_name: 'Lucas',
    last_name: 'Dupont',
    birth_date: '2010-10-10',
    gender: 'male',
    bio: 'Fils de Jean et Marie'
  };
  
  // Exécuter avant tous les tests
  beforeAll(async () => {
    // Initialiser la base de données de test
    await initTestDb();
    
    // Créer l'application de test
    app = createTestApp();
    
    // Générer des tokens pour les tests
    adminToken = generateTestToken('admin');
    memberToken = generateTestToken('member');
  });
  
  // Nettoyer la base de données avant chaque test
  beforeEach(async () => {
    await cleanTestDb();
  });
  
  // Fermer la connexion à la base de données après tous les tests
  afterAll(async () => {
    await closeTestDb();
  });
  
  describe('GET /api/family/members', () => {
    it('should return an empty array when no family members exist', async () => {
      const response = await request(app)
        .get('/api/family/members')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(0);
    });
    
    it('should return all family members', async () => {
      // Insérer des membres de test dans la base de données
      await testPool.query(
        `INSERT INTO family_members (id, first_name, last_name, birth_date, gender, bio)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), testFamilyMember1.first_name, testFamilyMember1.last_name, 
         testFamilyMember1.birth_date, testFamilyMember1.gender, testFamilyMember1.bio]
      );
      
      await testPool.query(
        `INSERT INTO family_members (id, first_name, last_name, birth_date, gender, bio)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), testFamilyMember2.first_name, testFamilyMember2.last_name, 
         testFamilyMember2.birth_date, testFamilyMember2.gender, testFamilyMember2.bio]
      );
      
      const response = await request(app)
        .get('/api/family/members')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('first_name');
      expect(response.body[0]).toHaveProperty('last_name');
    });
    
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/family/members');
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('POST /api/family/members', () => {
    it('should create a new family member', async () => {
      const response = await request(app)
        .post('/api/family/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testFamilyMember1);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.first_name).toBe(testFamilyMember1.first_name);
      expect(response.body.last_name).toBe(testFamilyMember1.last_name);
      expect(response.body.birth_date).toBe(testFamilyMember1.birth_date);
      expect(response.body.gender).toBe(testFamilyMember1.gender);
      expect(response.body.bio).toBe(testFamilyMember1.bio);
    });
    
    it('should require admin role', async () => {
      const response = await request(app)
        .post('/api/family/members')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(testFamilyMember1);
      
      expect(response.status).toBe(403);
    });
    
    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/family/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          last_name: 'Dupont',
          birth_date: '1980-01-01'
        });
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('GET /api/family/members/:id', () => {
    it('should return a specific family member', async () => {
      // Insérer un membre de test dans la base de données
      const result = await testPool.query(
        `INSERT INTO family_members (id, first_name, last_name, birth_date, gender, bio)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [uuidv4(), testFamilyMember1.first_name, testFamilyMember1.last_name, 
         testFamilyMember1.birth_date, testFamilyMember1.gender, testFamilyMember1.bio]
      );
      
      const memberId = result.rows[0].id;
      
      const response = await request(app)
        .get(`/api/family/members/${memberId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', memberId);
      expect(response.body.first_name).toBe(testFamilyMember1.first_name);
      expect(response.body.last_name).toBe(testFamilyMember1.last_name);
    });
    
    it('should return 404 for non-existent member', async () => {
      const nonExistentId = uuidv4();
      
      const response = await request(app)
        .get(`/api/family/members/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('PUT /api/family/members/:id', () => {
    it('should update a family member', async () => {
      // Insérer un membre de test dans la base de données
      const result = await testPool.query(
        `INSERT INTO family_members (id, first_name, last_name, birth_date, gender, bio)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [uuidv4(), testFamilyMember1.first_name, testFamilyMember1.last_name, 
         testFamilyMember1.birth_date, testFamilyMember1.gender, testFamilyMember1.bio]
      );
      
      const memberId = result.rows[0].id;
      
      const updatedData = {
        first_name: 'Jean-Pierre',
        bio: 'Biographie mise à jour'
      };
      
      const response = await request(app)
        .put(`/api/family/members/${memberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', memberId);
      expect(response.body.first_name).toBe(updatedData.first_name);
      expect(response.body.bio).toBe(updatedData.bio);
      expect(response.body.last_name).toBe(testFamilyMember1.last_name); // Inchangé
    });
    
    it('should require admin role', async () => {
      const memberId = uuidv4();
      
      const response = await request(app)
        .put(`/api/family/members/${memberId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ first_name: 'Updated' });
      
      expect(response.status).toBe(403);
    });
  });
  
  describe('DELETE /api/family/members/:id', () => {
    it('should delete a family member', async () => {
      // Insérer un membre de test dans la base de données
      const result = await testPool.query(
        `INSERT INTO family_members (id, first_name, last_name, birth_date, gender, bio)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [uuidv4(), testFamilyMember1.first_name, testFamilyMember1.last_name, 
         testFamilyMember1.birth_date, testFamilyMember1.gender, testFamilyMember1.bio]
      );
      
      const memberId = result.rows[0].id;
      
      const response = await request(app)
        .delete(`/api/family/members/${memberId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      
      // Vérifier que le membre a bien été supprimé
      const checkResult = await testPool.query(
        'SELECT * FROM family_members WHERE id = $1',
        [memberId]
      );
      
      expect(checkResult.rows.length).toBe(0);
    });
    
    it('should require admin role', async () => {
      const memberId = uuidv4();
      
      const response = await request(app)
        .delete(`/api/family/members/${memberId}`)
        .set('Authorization', `Bearer ${memberToken}`);
      
      expect(response.status).toBe(403);
    });
  });
  
  describe('Family Relationships', () => {
    let member1Id: string;
    let member2Id: string;
    let member3Id: string;
    
    beforeEach(async () => {
      // Créer des membres de test pour les relations
      const result1 = await testPool.query(
        `INSERT INTO family_members (id, first_name, last_name, birth_date, gender, bio)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [uuidv4(), testFamilyMember1.first_name, testFamilyMember1.last_name, 
         testFamilyMember1.birth_date, testFamilyMember1.gender, testFamilyMember1.bio]
      );
      
      const result2 = await testPool.query(
        `INSERT INTO family_members (id, first_name, last_name, birth_date, gender, bio)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [uuidv4(), testFamilyMember2.first_name, testFamilyMember2.last_name, 
         testFamilyMember2.birth_date, testFamilyMember2.gender, testFamilyMember2.bio]
      );
      
      const result3 = await testPool.query(
        `INSERT INTO family_members (id, first_name, last_name, birth_date, gender, bio)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [uuidv4(), testFamilyMember3.first_name, testFamilyMember3.last_name, 
         testFamilyMember3.birth_date, testFamilyMember3.gender, testFamilyMember3.bio]
      );
      
      member1Id = result1.rows[0].id;
      member2Id = result2.rows[0].id;
      member3Id = result3.rows[0].id;
    });
    
    it('should create a relationship between family members', async () => {
      const relationshipData = {
        member_id: member1Id,
        related_member_id: member2Id,
        relationship_type: 'spouse'
      };
      
      const response = await request(app)
        .post('/api/family/relationships')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(relationshipData);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.member_id).toBe(member1Id);
      expect(response.body.related_member_id).toBe(member2Id);
      expect(response.body.relationship_type).toBe('spouse');
    });
    
    it('should get all relationships for a member', async () => {
      // Créer des relations de test
      await testPool.query(
        `INSERT INTO family_relationships (id, member_id, related_member_id, relationship_type)
         VALUES ($1, $2, $3, $4)`,
        [uuidv4(), member1Id, member2Id, 'spouse']
      );
      
      await testPool.query(
        `INSERT INTO family_relationships (id, member_id, related_member_id, relationship_type)
         VALUES ($1, $2, $3, $4)`,
        [uuidv4(), member1Id, member3Id, 'parent']
      );
      
      const response = await request(app)
        .get(`/api/family/members/${member1Id}/relationships`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('member_id', member1Id);
    });
    
    it('should get a family tree for a member', async () => {
      // Créer des relations de test
      await testPool.query(
        `INSERT INTO family_relationships (id, member_id, related_member_id, relationship_type)
         VALUES ($1, $2, $3, $4)`,
        [uuidv4(), member1Id, member2Id, 'spouse']
      );
      
      await testPool.query(
        `INSERT INTO family_relationships (id, member_id, related_member_id, relationship_type)
         VALUES ($1, $2, $3, $4)`,
        [uuidv4(), member1Id, member3Id, 'parent']
      );
      
      await testPool.query(
        `INSERT INTO family_relationships (id, member_id, related_member_id, relationship_type)
         VALUES ($1, $2, $3, $4)`,
        [uuidv4(), member2Id, member3Id, 'parent']
      );
      
      const response = await request(app)
        .get(`/api/family/tree/${member1Id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('member');
      expect(response.body.member.id).toBe(member1Id);
      expect(response.body).toHaveProperty('relationships');
      expect(response.body.relationships).toBeInstanceOf(Array);
    });
  });
});
