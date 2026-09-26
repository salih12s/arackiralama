import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, IconButton, InputBase, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import { Add as AddIcon, DeleteOutline, SaveOutlined } from '@mui/icons-material';

import { notesApi } from '../api/notes';
import { a, fonts, monoSx } from '../admin/theme';
import { ConfirmDialog, PageHeader, panelSx } from '../admin/ui';

interface NoteRow {
  id?: string;
  rowIndex: number;
  content: string;
  isNew?: boolean;
  hasChanges?: boolean;
}

const MIN_ROWS = 50;

export default function Notes() {
  const [noteRows, setNoteRows] = useState<NoteRow[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<NoteRow | null>(null);
  const [savingRow, setSavingRow] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading, error } = useQuery({
    queryKey: ['notes'],
    queryFn: notesApi.getAll,
  });

  // Sunucudaki notlardan satırları kur; kaydedilmemiş yerel değişiklikler korunur.
  useEffect(() => {
    setNoteRows((previous) => {
      const sortedNotes = [...notes].sort((x, y) => x.rowIndex - y.rowIndex);
      const count = Math.max(MIN_ROWS, previous.length, (sortedNotes[sortedNotes.length - 1]?.rowIndex ?? -1) + 1);
      const rows: NoteRow[] = [];
      for (let i = 0; i < count; i++) {
        const local = previous.find((row) => row.rowIndex === i);
        const existingNote = sortedNotes.find((note) => note.rowIndex === i);
        if (local?.hasChanges) {
          rows.push({ ...local, id: existingNote?.id ?? local.id });
          continue;
        }
        rows.push({ id: existingNote?.id, rowIndex: i, content: existingNote?.content || '', isNew: !existingNote, hasChanges: false });
      }
      return rows;
    });
  }, [notes]);

  const createMutation = useMutation({
    mutationFn: notesApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { content: string } }) => notesApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: notesApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });

  const handleContentChange = (rowIndex: number, content: string) => {
    setNoteRows((prev) => prev.map((row) => (row.rowIndex === rowIndex ? { ...row, content, hasChanges: true } : row)));
  };

  const markSaved = (rowIndex: number) =>
    setNoteRows((prev) => prev.map((row) => (row.rowIndex === rowIndex ? { ...row, hasChanges: false } : row)));

  const handleSaveRow = async (rowIndex: number) => {
    const row = noteRows.find((r) => r.rowIndex === rowIndex);
    if (!row || !row.hasChanges) return;
    setSavingRow(rowIndex);
    try {
      if (row.content.trim() === '') {
        // Boşaltılan satırdaki not silinir
        if (row.id) await deleteMutation.mutateAsync(row.id);
      } else if (row.id) {
        await updateMutation.mutateAsync({ id: row.id, data: { content: row.content } });
      } else {
        await createMutation.mutateAsync({ rowIndex: row.rowIndex, content: row.content });
      }
      markSaved(rowIndex);
    } catch (saveError) {
      console.error('Error saving note:', saveError);
    } finally {
      setSavingRow(null);
    }
  };

  const saveAll = async () => {
    for (const row of noteRows.filter((r) => r.hasChanges)) await handleSaveRow(row.rowIndex);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setNoteRows((prev) => prev.map((row) => (row.rowIndex === deleteTarget.rowIndex ? { ...row, content: '', hasChanges: false, id: undefined } : row)));
      setDeleteTarget(null);
    } catch (deleteError) {
      console.error('Error deleting note:', deleteError);
    }
  };

  const addNewRow = () => {
    setNoteRows((prev) => [...prev, { rowIndex: prev.length, content: '', isNew: true, hasChanges: false }]);
  };

  const filled = noteRows.filter((row) => row.content.trim()).length;
  const dirty = noteRows.filter((row) => row.hasChanges).length;
  const saveFailed = createMutation.isError || updateMutation.isError;

  return (
    <>
      <PageHeader
        title="Notlar"
        subtitle={isLoading ? ' ' : `${filled} dolu satır${dirty ? ` · ${dirty} kaydedilmemiş` : ''}`}
        actions={
          <>
            {dirty > 0 && <Button variant="outlined" startIcon={<SaveOutlined />} onClick={saveAll}>Tümünü kaydet</Button>}
            <Button variant="contained" startIcon={<AddIcon />} onClick={addNewRow}>Satır ekle</Button>
          </>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>Notlar yüklenirken hata oluştu</Alert>}
      {saveFailed && <Alert severity="error" sx={{ mb: 2 }}>Bir not kaydedilemedi. Tekrar deneyin.</Alert>}

      <Box sx={{ ...panelSx, overflow: 'hidden' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${a.line}` }}>
          <Typography sx={{ fontSize: 13, color: a.muted }}>
            Satırdan çıkınca ya da <Box component="kbd" sx={{ ...monoSx, fontSize: 11.5, px: 0.6, py: 0.1, border: `1px solid ${a.line}`, borderRadius: '4px' }}>Enter</Box> ile kaydedilir. Satır boşaltılırsa not silinir.
          </Typography>
        </Stack>

        {isLoading ? (
          <Box sx={{ p: 2.5 }}>{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={40} />)}</Box>
        ) : (
          <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, maxHeight: 'calc(100dvh - 290px)', overflowY: 'auto' }}>
            {noteRows.map((row, index) => (
              <Box
                component="li"
                key={`${row.rowIndex}-${index}`}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '52px minmax(0, 1fr) 76px',
                  alignItems: 'start',
                  borderBottom: `1px solid ${a.lineSoft}`,
                  bgcolor: row.hasChanges ? a.accentSoft : 'transparent',
                  transition: 'background-color .15s ease',
                  '&:focus-within': { bgcolor: row.hasChanges ? a.accentSoft : a.hover },
                  '&:focus-within .note-gutter': { color: a.accent },
                }}
              >
                <Box className="note-gutter" sx={{ ...monoSx, fontSize: 12, color: a.subtle, textAlign: 'right', pr: 1.5, pt: '11px', borderRight: `1px solid ${a.lineSoft}`, alignSelf: 'stretch' }}>
                  {row.rowIndex + 1}
                </Box>
                <InputBase
                  fullWidth
                  multiline
                  maxRows={4}
                  value={row.content}
                  onChange={(e) => handleContentChange(row.rowIndex, e.target.value)}
                  onBlur={() => handleSaveRow(row.rowIndex)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSaveRow(row.rowIndex);
                    }
                  }}
                  inputProps={{ 'aria-label': `Satır ${row.rowIndex + 1} notu` }}
                  sx={{ px: 1.75, py: 1, fontFamily: fonts.sans, fontSize: 14.5, color: a.ink, lineHeight: 1.5 }}
                />
                <Stack direction="row" spacing={0.25} justifyContent="flex-end" alignItems="center" sx={{ pr: 1, pt: 0.5, minHeight: 40 }}>
                  {row.hasChanges && (
                    <Tooltip title="Kaydet">
                      <span>
                        <IconButton size="small" onClick={() => handleSaveRow(row.rowIndex)} disabled={savingRow === row.rowIndex} aria-label={`Satır ${row.rowIndex + 1} kaydet`} sx={{ color: a.accent }}>
                          <SaveOutlined fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  {row.id && !row.hasChanges && (
                    <Tooltip title="Sil">
                      <IconButton size="small" onClick={() => setDeleteTarget(row)} aria-label={`Satır ${row.rowIndex + 1} sil`} sx={{ opacity: 0.55, '@media (hover: hover)': { '&:hover': { opacity: 1, color: a.danger } } }}>
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        danger
        title="Notu sil"
        body={<>{deleteTarget ? `${deleteTarget.rowIndex + 1}. satırdaki not silinecek.` : ''}</>}
        confirmLabel="Sil"
        pendingLabel="Siliniyor…"
        pending={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}
