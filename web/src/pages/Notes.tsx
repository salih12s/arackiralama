import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from '@mui/icons-material';

import Layout from '../components/Layout';
import { notesApi, Note } from '../api/notes';

interface NoteRow {
  id?: string;
  rowIndex: number;
  content: string;
  isNew?: boolean;
  hasChanges?: boolean;
}

export default function Notes() {
  const [noteRows, setNoteRows] = useState<NoteRow[]>([]);
  const queryClient = useQueryClient();

  // Fetch notes
  const { data: notes = [], isLoading, error } = useQuery({
    queryKey: ['notes'],
    queryFn: notesApi.getAll,
  });

  // Initialize note rows from fetched data
  useEffect(() => {
    if (notes.length > 0) {
      const sortedNotes = [...notes].sort((a, b) => a.rowIndex - b.rowIndex);
      const rows: NoteRow[] = [];
      
      // Create 50 rows, fill with existing notes or empty
      for (let i = 0; i < 50; i++) {
        const existingNote = sortedNotes.find(note => note.rowIndex === i);
        rows.push({
          id: existingNote?.id,
          rowIndex: i,
          content: existingNote?.content || '',
          isNew: !existingNote,
          hasChanges: false,
        });
      }
      setNoteRows(rows);
    } else {
      // Create 50 empty rows
      const rows: NoteRow[] = [];
      for (let i = 0; i < 50; i++) {
        rows.push({
          rowIndex: i,
          content: '',
          isNew: true,
          hasChanges: false,
        });
      }
      setNoteRows(rows);
    }
  }, [notes]);

  // Create note mutation
  const createMutation = useMutation({
    mutationFn: notesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  // Update note mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { content: string } }) => 
      notesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  // Delete note mutation
  const deleteMutation = useMutation({
    mutationFn: notesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const handleContentChange = (rowIndex: number, content: string) => {
    setNoteRows(prev => 
      prev.map(row => 
        row.rowIndex === rowIndex 
          ? { ...row, content, hasChanges: true }
          : row
      )
    );
  };

  const handleSaveRow = async (rowIndex: number) => {
    const row = noteRows.find(r => r.rowIndex === rowIndex);
    if (!row) return;

    try {
      if (row.content.trim() === '') {
        // If content is empty and note exists, delete it
        if (row.id) {
          await deleteMutation.mutateAsync(row.id);
        }
      } else if (row.id) {
        // Update existing note
        await updateMutation.mutateAsync({
          id: row.id,
          data: { content: row.content }
        });
      } else {
        // Create new note
        await createMutation.mutateAsync({
          rowIndex: row.rowIndex,
          content: row.content
        });
      }
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const handleDeleteRow = async (rowIndex: number) => {
    const row = noteRows.find(r => r.rowIndex === rowIndex);
    if (!row || !row.id) return;

    if (window.confirm('Bu notu silmek istediğinizden emin misiniz?')) {
      try {
        await deleteMutation.mutateAsync(row.id);
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    }
  };

  const addNewRow = () => {
    const nextIndex = noteRows.length;
    setNoteRows(prev => [
      ...prev,
      {
        rowIndex: nextIndex,
        content: '',
        isNew: true,
        hasChanges: false,
      }
    ]);
  };

  if (isLoading) return <Layout><Typography>Yükleniyor...</Typography></Layout>;
  if (error) return <Layout><Alert severity="error">Veriler yüklenirken hata oluştu</Alert></Layout>;

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            NOTLAR
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={addNewRow}
          >
            Yeni Satır Ekle
          </Button>
        </Box>

        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <Typography variant="body2" color="textSecondary" sx={{ p: 2, pb: 0 }}>
            Excel benzeri not defteri. Her satıra önemli notlarınızı yazabilirsiniz.
          </Typography>
          
          <TableContainer sx={{ maxHeight: '70vh' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '8%', textAlign: 'center' }}>
                    <strong>Satır</strong>
                  </TableCell>
                  <TableCell sx={{ width: '82%' }}>
                    <strong>Not İçeriği</strong>
                  </TableCell>
                  <TableCell sx={{ width: '10%', textAlign: 'center' }}>
                    <strong>İşlemler</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {noteRows.map((row, index) => (
                  <TableRow key={`${row.rowIndex}-${index}`} hover>
                    <TableCell sx={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {row.rowIndex + 1}
                    </TableCell>
                    
                    <TableCell sx={{ p: 1 }}>
                      <TextField
                        fullWidth
                        size="small"
                        value={row.content}
                        onChange={(e) => handleContentChange(row.rowIndex, e.target.value)}
                        placeholder={`Satır ${row.rowIndex + 1} notu...`}
                        variant="outlined"
                        multiline
                        maxRows={3}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontFamily: 'monospace',
                            fontSize: '14px',
                            '& fieldset': {
                              border: row.hasChanges ? '2px solid #1976d2' : '1px solid rgba(0, 0, 0, 0.23)',
                            },
                          }
                        }}
                      />
                    </TableCell>
                    
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        {row.hasChanges && (
                          <IconButton
                            size="small"
                            onClick={() => handleSaveRow(row.rowIndex)}
                            color="primary"
                            title="Kaydet"
                          >
                            <SaveIcon fontSize="small" />
                          </IconButton>
                        )}
                        
                        {row.id && (
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteRow(row.rowIndex)}
                            color="error"
                            title="Sil"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {noteRows.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="textSecondary">
                Henüz not bulunmamaktadır. "Yeni Satır Ekle" butonuna tıklayarak başlayın.
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Layout>
  );
}