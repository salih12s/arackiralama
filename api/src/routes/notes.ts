import express from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

const createNoteSchema = z.object({
  rowIndex: z.number().int().min(0),
  content: z.string(),
});

const updateNoteSchema = z.object({
  rowIndex: z.number().int().min(0).optional(),
  content: z.string().optional(),
});

// GET /api/notes
router.get('/', async (req, res) => {
  try {
    const notes = await (prisma as any).note.findMany({
      orderBy: {
        rowIndex: 'asc'
      }
    });

    res.json(notes);
  } catch (error) {
    console.error('Notes fetch error:', error);
    res.status(500).json({ error: 'Notlar getirilirken hata oluştu' });
  }
});

// GET /api/notes/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const note = await (prisma as any).note.findUnique({
      where: { id }
    });

    if (!note) {
      return res.status(404).json({ error: 'Not bulunamadı' });
    }

    res.json(note);
  } catch (error) {
    console.error('Note fetch error:', error);
    res.status(500).json({ error: 'Not getirilirken hata oluştu' });
  }
});

// POST /api/notes
router.post('/', async (req, res) => {
  try {
    const validatedData = createNoteSchema.parse(req.body);
    
    const note = await (prisma as any).note.create({
      data: validatedData
    });

    res.status(201).json(note);
  } catch (error) {
    console.error('Note creation error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Geçersiz veri formatı', details: error.errors });
    }
    res.status(500).json({ error: 'Not oluşturulurken hata oluştu' });
  }
});

// PUT /api/notes/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateNoteSchema.parse(req.body);
    
    const note = await (prisma as any).note.update({
      where: { id },
      data: validatedData
    });

    res.json(note);
  } catch (error) {
    console.error('Note update error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Geçersiz veri formatı', details: error.errors });
    }
    res.status(500).json({ error: 'Not güncellenirken hata oluştu' });
  }
});

// DELETE /api/notes/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await (prisma as any).note.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Note deletion error:', error);
    res.status(500).json({ error: 'Not silinirken hata oluştu' });
  }
});

export default router;