import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { initTestDb, cleanTestDb, closeTestDb } from '../utils/testDb';
import FamilyController from '../../controllers/familyController';
import FamilyModel from '../../models/familyModel';

// Étendre l'interface Request pour inclure l'utilisateur
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

// Mock du modèle
jest.mock('../../models/familyModel');

describe('FamilyController Unit Tests', () => {
  let familyController: typeof FamilyController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockFamilyModel: jest.Mocked<typeof FamilyModel>;
  
  // Données de test
  const testFamilyMember1 = {
    id: uuidv4(),
    first_name: 'Jean',
    last_name: 'Dupont',
    birth_date: '1980-01-01',
    gender: 'male' as 'male' | 'female' | 'other',
    bio: 'Membre fondateur de la famille',
    is_alive: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  const testFamilyMember2 = {
    id: uuidv4(),
    first_name: 'Marie',
    last_name: 'Dupont',
    birth_date: '1982-05-15',
    gender: 'female' as 'male' | 'female' | 'other',
    bio: 'Épouse de Jean',
    is_alive: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // Exécuter avant tous les tests
  beforeAll(async () => {
    // Initialiser la base de données de test
    await initTestDb();
  });
  
  // Configurer les mocks avant chaque test
  beforeEach(() => {
    // Créer un mock du modèle
    mockFamilyModel = {
      getAllFamilyMembers: jest.fn(),
      getFamilyMemberById: jest.fn(),
      createFamilyMember: jest.fn(),
      updateFamilyMember: jest.fn(),
      deleteFamilyMember: jest.fn(),
      createFamilyRelationship: jest.fn(),
      getFamilyRelationships: jest.fn(),
      getFamilyTree: jest.fn()
    } as unknown as jest.Mocked<typeof FamilyModel>;
    
    // Créer une instance du contrôleur
    familyController = {
      getAllFamilyMembers: jest.fn(),
      getFamilyMemberById: jest.fn(),
      createFamilyMember: jest.fn(),
      updateFamilyMember: jest.fn(),
      deleteFamilyMember: jest.fn(),
      createFamilyRelationship: jest.fn(),
      getFamilyRelationships: jest.fn(),
      getFamilyTree: jest.fn()
    } as unknown as typeof FamilyController;
    
    // Configurer les mocks pour la requête et la réponse
    mockRequest = {
      params: {},
      query: {},
      body: {},
      user: {
        id: uuidv4(),
        email: 'test@example.com',
        role: 'admin'
      }
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
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
    it('should return all family members', async () => {
      const mockMembers = [testFamilyMember1, testFamilyMember2];
      
      // Configurer le mock du modèle
      mockFamilyModel.getAllFamilyMembers = jest.fn().mockResolvedValue(mockMembers);
      
      await familyController.getAllFamilyMembers(mockRequest as Request, mockResponse as Response);
      
      expect(mockFamilyModel.getAllFamilyMembers).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockMembers);
    });
    
    it('should handle errors', async () => {
      // Configurer le mock du modèle pour simuler une erreur
      mockFamilyModel.getAllFamilyMembers = jest.fn().mockRejectedValue(new Error('Database error'));
      
      await familyController.getAllFamilyMembers(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(String)
      }));
    });
  });
  
  describe('getFamilyMemberById', () => {
    it('should return a specific family member', async () => {
      // Configurer les paramètres de la requête
      mockRequest.params = { id: testFamilyMember1.id };
      
      // Configurer le mock du modèle
      mockFamilyModel.getFamilyMemberById = jest.fn().mockResolvedValue(testFamilyMember1);
      
      await familyController.getFamilyMemberById(mockRequest as Request, mockResponse as Response);
      
      expect(mockFamilyModel.getFamilyMemberById).toHaveBeenCalledWith(testFamilyMember1.id);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(testFamilyMember1);
    });
    
    it('should return 404 for non-existent member', async () => {
      // Configurer les paramètres de la requête
      mockRequest.params = { id: uuidv4() };
      
      // Configurer le mock du modèle
      mockFamilyModel.getFamilyMemberById = jest.fn().mockResolvedValue(null);
      
      await familyController.getFamilyMemberById(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(String)
      }));
    });
  });
  
  describe('createFamilyMember', () => {
    it('should create a new family member', async () => {
      // Configurer le corps de la requête
      mockRequest.body = {
        first_name: testFamilyMember1.first_name,
        last_name: testFamilyMember1.last_name,
        birth_date: testFamilyMember1.birth_date,
        gender: testFamilyMember1.gender,
        bio: testFamilyMember1.bio
      };
      
      // Configurer le mock du modèle
      mockFamilyModel.createFamilyMember = jest.fn().mockResolvedValue(testFamilyMember1);
      
      await familyController.createFamilyMember(mockRequest as Request, mockResponse as Response);
      
      expect(mockFamilyModel.createFamilyMember).toHaveBeenCalledWith(mockRequest.body);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(testFamilyMember1);
    });
    
    it('should validate required fields', async () => {
      // Configurer le corps de la requête avec des champs manquants
      mockRequest.body = {
        last_name: testFamilyMember1.last_name
      };
      
      await familyController.createFamilyMember(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(String)
      }));
      expect(mockFamilyModel.createFamilyMember).not.toHaveBeenCalled();
    });
  });
  
  describe('updateFamilyMember', () => {
    it('should update a family member', async () => {
      // Configurer les paramètres de la requête
      mockRequest.params = { id: testFamilyMember1.id };
      
      // Configurer le corps de la requête
      mockRequest.body = {
        first_name: 'Jean-Pierre',
        bio: 'Biographie mise à jour'
      };
      
      // Configurer le mock du modèle
      const updatedMember = {
        ...testFamilyMember1,
        first_name: 'Jean-Pierre',
        bio: 'Biographie mise à jour'
      };
      mockFamilyModel.updateFamilyMember = jest.fn().mockResolvedValue(updatedMember);
      
      await familyController.updateFamilyMember(mockRequest as Request, mockResponse as Response);
      
      expect(mockFamilyModel.updateFamilyMember).toHaveBeenCalledWith(testFamilyMember1.id, mockRequest.body);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(updatedMember);
    });
    
    it('should return 404 for non-existent member', async () => {
      // Configurer les paramètres de la requête
      mockRequest.params = { id: uuidv4() };
      
      // Configurer le corps de la requête
      mockRequest.body = {
        first_name: 'Jean-Pierre'
      };
      
      // Configurer le mock du modèle
      mockFamilyModel.updateFamilyMember = jest.fn().mockResolvedValue(null);
      
      await familyController.updateFamilyMember(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(String)
      }));
    });
  });
  
  describe('deleteFamilyMember', () => {
    it('should delete a family member', async () => {
      // Configurer les paramètres de la requête
      mockRequest.params = { id: testFamilyMember1.id };
      
      // Configurer le mock du modèle
      mockFamilyModel.deleteFamilyMember = jest.fn().mockResolvedValue(true);
      
      await familyController.deleteFamilyMember(mockRequest as Request, mockResponse as Response);
      
      expect(mockFamilyModel.deleteFamilyMember).toHaveBeenCalledWith(testFamilyMember1.id);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.any(String)
      }));
    });
    
    it('should return 404 for non-existent member', async () => {
      // Configurer les paramètres de la requête
      mockRequest.params = { id: uuidv4() };
      
      // Configurer le mock du modèle
      mockFamilyModel.deleteFamilyMember = jest.fn().mockResolvedValue(false);
      
      await familyController.deleteFamilyMember(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(String)
      }));
    });
  });
  
  describe('Family Relationships', () => {
    const testRelationship = {
      id: uuidv4(),
      from_member_id: testFamilyMember1.id,
      to_member_id: testFamilyMember2.id,
      relationship_type: 'spouse' as 'spouse' | 'parent' | 'child' | 'sibling' | 'other',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    describe('createFamilyRelationship', () => {
      it('should create a relationship between family members', async () => {
        // Configurer le corps de la requête
        mockRequest.body = {
          from_member_id: testFamilyMember1.id,
          to_member_id: testFamilyMember2.id,
          relationship_type: 'spouse' as 'spouse' | 'parent' | 'child' | 'sibling' | 'other'
        };
        
        // Configurer le mock du modèle
        mockFamilyModel.createFamilyRelationship = jest.fn().mockResolvedValue(testRelationship);
        
        await familyController.createFamilyRelationship(mockRequest as Request, mockResponse as Response);
        
        expect(mockFamilyModel.createFamilyRelationship).toHaveBeenCalledWith(mockRequest.body);
        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(mockResponse.json).toHaveBeenCalledWith(testRelationship);
      });
      
      it('should validate required fields', async () => {
        // Configurer le corps de la requête avec des champs manquants
        mockRequest.body = {
          from_member_id: testFamilyMember1.id
        };
        
        await familyController.createFamilyRelationship(mockRequest as Request, mockResponse as Response);
        
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
          error: expect.any(String)
        }));
        expect(mockFamilyModel.createFamilyRelationship).not.toHaveBeenCalled();
      });
    });
    
    describe('getFamilyRelationships', () => {
      it('should get all relationships for a member', async () => {
        // Configurer les paramètres de la requête
        mockRequest.params = { id: testFamilyMember1.id };
        
        // Configurer le mock du modèle
        mockFamilyModel.getAllFamilyRelationships = jest.fn().mockResolvedValue([testRelationship]);
        
        await familyController.getAllFamilyRelationships(mockRequest as Request, mockResponse as Response);
        
        expect(mockFamilyModel.getAllFamilyRelationships).toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith([testRelationship]);
      });
    });
    
    describe('getFamilyTree', () => {
      it('should get a family tree for a member', async () => {
        // Configurer les paramètres de la requête
        mockRequest.params = { id: testFamilyMember1.id };
        
        // Configurer le mock du modèle
        const familyTree = {
          member: testFamilyMember1,
          relationships: [
            {
              relationship: testRelationship,
              member: testFamilyMember2
            }
          ]
        };
        mockFamilyModel.getFamilyTree = jest.fn().mockResolvedValue(familyTree);
        
        await familyController.getFamilyTree(mockRequest as Request, mockResponse as Response);
        
        expect(mockFamilyModel.getFamilyTree).toHaveBeenCalledWith(testFamilyMember1.id);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(familyTree);
      });
    });
  });
});
