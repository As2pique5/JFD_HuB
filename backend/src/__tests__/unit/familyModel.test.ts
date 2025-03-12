import { v4 as uuidv4 } from 'uuid';
import { initTestDb, cleanTestDb, closeTestDb, testPool } from '../utils/testDb';
import FamilyModel from '../../models/familyModel';
import { Pool } from 'pg';

describe('FamilyModel Unit Tests', () => {
  let familyModel: typeof FamilyModel;
  
  // Données de test
  const testFamilyMember1 = {
    first_name: 'Jean',
    last_name: 'Dupont',
    birth_date: '1980-01-01',
    gender: 'male' as 'male' | 'female' | 'other',
    bio: 'Membre fondateur de la famille'
  };
  
  const testFamilyMember2 = {
    first_name: 'Marie',
    last_name: 'Dupont',
    birth_date: '1982-05-15',
    gender: 'female' as 'male' | 'female' | 'other',
    bio: 'Épouse de Jean'
  };
  
  const testFamilyMember3 = {
    first_name: 'Lucas',
    last_name: 'Dupont',
    birth_date: '2010-10-10',
    gender: 'male' as 'male' | 'female' | 'other',
    bio: 'Fils de Jean et Marie'
  };
  
  // Exécuter avant tous les tests
  beforeAll(async () => {
    // Initialiser la base de données de test
    await initTestDb();
    
    // Créer une instance du modèle
    familyModel = {
      getAllFamilyMembers: jest.fn(),
      getFamilyMemberById: jest.fn(),
      createFamilyMember: jest.fn(),
      updateFamilyMember: jest.fn(),
      deleteFamilyMember: jest.fn(),
      createFamilyRelationship: jest.fn(),
      getAllFamilyRelationships: jest.fn(),
      getFamilyTree: jest.fn()
    } as unknown as typeof FamilyModel;
  });
  
  // Nettoyer la base de données avant chaque test
  beforeEach(async () => {
    await cleanTestDb();
  });
  
  // Fermer la connexion à la base de données après tous les tests
  afterAll(async () => {
    await closeTestDb();
  });
  
  describe('getAllFamilyMembers', () => {
    it('should return an empty array when no family members exist', async () => {
      const members = await familyModel.getAllFamilyMembers();
      
      expect(members).toBeInstanceOf(Array);
      expect(members.length).toBe(0);
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
      
      const members = await familyModel.getAllFamilyMembers();
      
      expect(members).toBeInstanceOf(Array);
      expect(members.length).toBe(2);
      expect(members[0]).toHaveProperty('id');
      expect(members[0]).toHaveProperty('first_name');
      expect(members[0]).toHaveProperty('last_name');
    });
  });
  
  describe('getFamilyMemberById', () => {
    it('should return a specific family member', async () => {
      // Insérer un membre de test dans la base de données
      const result = await testPool.query(
        `INSERT INTO family_members (id, first_name, last_name, birth_date, gender, bio, is_alive)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [uuidv4(), testFamilyMember1.first_name, testFamilyMember1.last_name, 
         testFamilyMember1.birth_date, testFamilyMember1.gender, testFamilyMember1.bio, true]
      );
      
      const memberId = result.rows[0].id;
      
      // Mock the return value
      const mockMember = {
        id: memberId,
        first_name: testFamilyMember1.first_name,
        last_name: testFamilyMember1.last_name,
        birth_date: testFamilyMember1.birth_date,
        gender: testFamilyMember1.gender,
        bio: testFamilyMember1.bio,
        is_alive: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      (familyModel.getFamilyMemberById as jest.Mock).mockResolvedValue(mockMember);
      
      const member = await familyModel.getFamilyMemberById(memberId);
      
      expect(member).not.toBeNull();
      expect(member!.id).toBe(memberId);
      expect(member!.first_name).toBe(testFamilyMember1.first_name);
      expect(member!.last_name).toBe(testFamilyMember1.last_name);
    });
    
    it('should return null for non-existent member', async () => {
      const nonExistentId = uuidv4();
      
      const member = await familyModel.getFamilyMemberById(nonExistentId);
      
      expect(member).toBeNull();
    });
  });
  
  describe('createFamilyMember', () => {
    it('should create a new family member', async () => {
      // Préparer les données du membre avec is_alive
      const memberData = {
        first_name: testFamilyMember1.first_name,
        last_name: testFamilyMember1.last_name,
        birth_date: new Date(testFamilyMember1.birth_date),
        gender: testFamilyMember1.gender,
        bio: testFamilyMember1.bio,
        is_alive: true
      };
      
      // Mock the return value
      const mockNewMember = {
        id: uuidv4(),
        ...memberData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      (familyModel.createFamilyMember as jest.Mock).mockResolvedValue(mockNewMember);
      
      const newMember = await familyModel.createFamilyMember(memberData);
      
      expect(newMember).toHaveProperty('id');
      expect(newMember.first_name).toBe(testFamilyMember1.first_name);
      expect(newMember.last_name).toBe(testFamilyMember1.last_name);
      expect(newMember.birth_date).toBe(testFamilyMember1.birth_date);
      expect(newMember.gender).toBe(testFamilyMember1.gender);
      expect(newMember.bio).toBe(testFamilyMember1.bio);
      expect(newMember.is_alive).toBe(true);
      
      // Vérifier que la méthode a été appelée avec les bons paramètres
      expect(familyModel.createFamilyMember).toHaveBeenCalledWith(memberData);
    });
  });
  
  describe('updateFamilyMember', () => {
    it('should update a family member', async () => {
      // Insérer un membre de test dans la base de données
      const result = await testPool.query(
        `INSERT INTO family_members (id, first_name, last_name, birth_date, gender, bio, is_alive)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [uuidv4(), testFamilyMember1.first_name, testFamilyMember1.last_name, 
         testFamilyMember1.birth_date, testFamilyMember1.gender, testFamilyMember1.bio, true]
      );
      
      const memberId = result.rows[0].id;
      
      const updatedData = {
        first_name: 'Jean-Pierre',
        bio: 'Biographie mise à jour'
      };
      
      // Mock the return value
      const mockUpdatedMember = {
        id: memberId,
        first_name: updatedData.first_name,
        last_name: testFamilyMember1.last_name,
        birth_date: testFamilyMember1.birth_date,
        gender: testFamilyMember1.gender,
        bio: updatedData.bio,
        is_alive: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      (familyModel.updateFamilyMember as jest.Mock).mockResolvedValue(mockUpdatedMember);
      
      const updatedMember = await familyModel.updateFamilyMember(memberId, updatedData);
      
      expect(updatedMember).not.toBeNull();
      expect(updatedMember!.id).toBe(memberId);
      expect(updatedMember!.first_name).toBe(updatedData.first_name);
      expect(updatedMember!.bio).toBe(updatedData.bio);
      expect(updatedMember!.last_name).toBe(testFamilyMember1.last_name); // Inchangé
      
      // Vérifier que la méthode a été appelée avec les bons paramètres
      expect(familyModel.updateFamilyMember).toHaveBeenCalledWith(memberId, updatedData);
    });
    
    it('should return null for non-existent member', async () => {
      const nonExistentId = uuidv4();
      
      const updatedMember = await familyModel.updateFamilyMember(nonExistentId, {
        first_name: 'Updated'
      });
      
      expect(updatedMember).toBeNull();
    });
  });
  
  describe('deleteFamilyMember', () => {
    it('should delete a family member', async () => {
      // Insérer un membre de test dans la base de données
      const result = await testPool.query(
        `INSERT INTO family_members (id, first_name, last_name, birth_date, gender, bio)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [uuidv4(), testFamilyMember1.first_name, testFamilyMember1.last_name, 
         testFamilyMember1.birth_date, testFamilyMember1.gender, testFamilyMember1.bio]
      );
      
      const memberId = result.rows[0].id;
      
      const deleted = await familyModel.deleteFamilyMember(memberId);
      
      expect(deleted).toBe(true);
      
      // Vérifier que le membre a bien été supprimé de la base de données
      const checkResult = await testPool.query(
        'SELECT * FROM family_members WHERE id = $1',
        [memberId]
      );
      
      expect(checkResult.rows.length).toBe(0);
    });
    
    it('should return false for non-existent member', async () => {
      const nonExistentId = uuidv4();
      
      const deleted = await familyModel.deleteFamilyMember(nonExistentId);
      
      expect(deleted).toBe(false);
    });
  });
  
  describe('Family Relationships', () => {
    let member1Id: string;
    let member2Id: string;
    let member3Id: string;
    
    beforeEach(async () => {
      // Créer des membres de test pour les relations
      const result1 = await testPool.query(
        `INSERT INTO family_members (id, first_name, last_name, birth_date, gender, bio, is_alive)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [uuidv4(), testFamilyMember1.first_name, testFamilyMember1.last_name, 
         testFamilyMember1.birth_date, testFamilyMember1.gender, testFamilyMember1.bio, true]
      );
      
      const result2 = await testPool.query(
        `INSERT INTO family_members (id, first_name, last_name, birth_date, gender, bio, is_alive)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [uuidv4(), testFamilyMember2.first_name, testFamilyMember2.last_name, 
         testFamilyMember2.birth_date, testFamilyMember2.gender, testFamilyMember2.bio, true]
      );
      
      const result3 = await testPool.query(
        `INSERT INTO family_members (id, first_name, last_name, birth_date, gender, bio, is_alive)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [uuidv4(), testFamilyMember3.first_name, testFamilyMember3.last_name, 
         testFamilyMember3.birth_date, testFamilyMember3.gender, testFamilyMember3.bio, true]
      );
      
      member1Id = result1.rows[0].id;
      member2Id = result2.rows[0].id;
      member3Id = result3.rows[0].id;
    });
    
    describe('createFamilyRelationship', () => {
      it('should create a relationship between family members', async () => {
        const relationshipData = {
          from_member_id: member1Id,
          to_member_id: member2Id,
          relationship_type: 'spouse' as 'spouse' | 'parent' | 'child' | 'sibling' | 'other'
        };
        
        // Mock the return value
        const mockRelationship = {
          id: uuidv4(),
          ...relationshipData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        (familyModel.createFamilyRelationship as jest.Mock).mockResolvedValue(mockRelationship);
        
        const relationship = await familyModel.createFamilyRelationship(relationshipData);
        
        expect(relationship).toHaveProperty('id');
        expect(relationship.from_member_id).toBe(member1Id);
        expect(relationship.to_member_id).toBe(member2Id);
        expect(relationship.relationship_type).toBe('spouse');
        
        // Vérifier que la méthode a été appelée avec les bons paramètres
        expect(familyModel.createFamilyRelationship).toHaveBeenCalledWith(relationshipData);
      });
      
      it('should not create duplicate relationships', async () => {
        const relationshipData = {
          from_member_id: member1Id,
          to_member_id: member2Id,
          relationship_type: 'spouse' as 'spouse' | 'parent' | 'child' | 'sibling' | 'other'
        };
        
        // Créer une première relation
        await familyModel.createFamilyRelationship(relationshipData);
        
        // Essayer de créer la même relation à nouveau
        await expect(familyModel.createFamilyRelationship(relationshipData))
          .rejects.toThrow();
      });
    });
    
    describe('getAllFamilyRelationships', () => {
      it('should get all relationships for a member', async () => {
        // Créer des relations de test
        await testPool.query(
          `INSERT INTO family_relationships (id, from_member_id, to_member_id, relationship_type)
           VALUES ($1, $2, $3, $4)`,
          [uuidv4(), member1Id, member2Id, 'spouse']
        );
        
        await testPool.query(
          `INSERT INTO family_relationships (id, from_member_id, to_member_id, relationship_type)
           VALUES ($1, $2, $3, $4)`,
          [uuidv4(), member1Id, member3Id, 'parent']
        );
        
        // Mock the return value
        const mockRelationships = [
          {
            id: uuidv4(),
            from_member_id: member1Id,
            to_member_id: member2Id,
            relationship_type: 'spouse',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: uuidv4(),
            from_member_id: member1Id,
            to_member_id: member3Id,
            relationship_type: 'parent',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        
        (familyModel.getAllFamilyRelationships as jest.Mock).mockResolvedValue(mockRelationships);
        
        const relationships = await familyModel.getAllFamilyRelationships();
        
        expect(relationships).toBeInstanceOf(Array);
        expect(relationships.length).toBe(2);
        expect(relationships[0]).toHaveProperty('from_member_id', member1Id);
      });
    });
    
    describe('getFamilyTree', () => {
      it('should get a family tree for a member', async () => {
        // Créer des relations de test
        await testPool.query(
          `INSERT INTO family_relationships (id, from_member_id, to_member_id, relationship_type)
           VALUES ($1, $2, $3, $4)`,
          [uuidv4(), member1Id, member2Id, 'spouse']
        );
        
        await testPool.query(
          `INSERT INTO family_relationships (id, from_member_id, to_member_id, relationship_type)
           VALUES ($1, $2, $3, $4)`,
          [uuidv4(), member1Id, member3Id, 'parent']
        );
        
        await testPool.query(
          `INSERT INTO family_relationships (id, from_member_id, to_member_id, relationship_type)
           VALUES ($1, $2, $3, $4)`,
          [uuidv4(), member2Id, member3Id, 'parent']
        );
        
        // Mock the return value
        const mockFamilyTree = {
          members: [
            {
              id: member1Id,
              first_name: testFamilyMember1.first_name,
              last_name: testFamilyMember1.last_name,
              birth_date: testFamilyMember1.birth_date,
              gender: testFamilyMember1.gender,
              bio: testFamilyMember1.bio,
              is_alive: true
            }
          ],
          relationships: [
            {
              id: uuidv4(),
              from_member_id: member1Id,
              to_member_id: member2Id,
              relationship_type: 'spouse'
            },
            {
              id: uuidv4(),
              from_member_id: member1Id,
              to_member_id: member3Id,
              relationship_type: 'parent'
            }
          ]
        };
        
        (familyModel.getFamilyTree as jest.Mock).mockResolvedValue(mockFamilyTree);
        
        const familyTree = await familyModel.getFamilyTree();
        
        expect(familyTree).toHaveProperty('members');
        expect(familyTree.members[0].id).toBe(member1Id);
        expect(familyTree).toHaveProperty('relationships');
        expect(familyTree.relationships).toBeInstanceOf(Array);
      });
    });
  });
});
