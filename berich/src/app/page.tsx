'use client';

import React, { useState, useEffect, useRef } from 'react';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import dynamic from 'next/dynamic';

const ForecastChart = dynamic(() => import('@/components/ForecastChart'), { ssr: false });

interface TransactionData {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  isInstallment: boolean;
  currentInstallment: number | null;
  totalInstallments: number | null;
  bank: string | null;
  isManual: boolean;
  isEdited: boolean;
  hasDivergence: boolean;
  originalAmount: number | null;
  originalDescription: string | null;
  startMonth: string | null;
  invoice?: {
    bank: string;
    dueDate: string | null;
  } | null;
  createdAt?: string;
}

export default function Home() {
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [categories, setCategories] = useState<string[]>(['Outros']);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Modal State
  const [editModal, setEditModal] = useState<TransactionData | null>(null);
  const [editForm, setEditForm] = useState({
    description: '',
    amount: '',
    category: '',
    isInstallment: false,
    currentInstallment: '',
    totalInstallments: '',
    startMonth: '',
  });

  // Add Modal State
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    description: '',
    amount: '',
    category: 'Outros',
    bank: '',
    isInstallment: false,
    currentInstallment: '1',
    totalInstallments: '2',
    startMonth: format(new Date(), 'yyyy-MM'),
  });

  // Screenshot Preview State
  interface PreviewTransaction {
    _tempId: string;
    description: string;
    amount: number;
    isInstallment: boolean;
    currentInstallment: number | null;
    totalInstallments: number | null;
    _removed?: boolean;
  }
  const [screenshotPreview, setScreenshotPreview] = useState<{
    show: boolean;
    bank: string | null;
    transactions: PreviewTransaction[];
    confidence: number;
    rawText: string;
    imageUrl: string | null;
    needsBankSelection: boolean;
    dueDate: string;
  } | null>(null);
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/berich/api/categories');
      if (res.ok) {
        const data = await res.json();
        if (data.categories) {
          const dbCats = data.categories.map((c: any) => c.name);
          const allCats = Array.from(new Set(['Outros', ...dbCats]));
          setCategories(allCats);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch('/berich/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() })
      });
      if (res.ok) {
        setNewCategoryName('');
        fetchCategories();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao adicionar categoria');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteCategory = async (name: string) => {
    if (name === 'Outros') {
      alert('A categoria "Outros" não pode ser excluída.');
      return;
    }
    if (confirm(`Tem certeza que deseja excluir a categoria "${name}"? Todas as despesas usarão "Outros".`)) {
      try {
        // Find the id first
        const res = await fetch('/berich/api/categories');
        const data = await res.json();
        const cat = data.categories.find((c: any) => c.name === name);
        if (cat) {
          await fetch(`/berich/api/categories?id=${cat.id}`, { method: 'DELETE' });
          fetchCategories();
          fetchTransactions(); // Refresh transactions as their category might have changed to 'Outros'
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/berich/api/transactions');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (isImageFile(file)) {
        handleImageUpload(file);
      } else {
        handleFileUpload(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (isImageFile(file)) {
        handleImageUpload(file);
      } else {
        handleFileUpload(file);
      }
    }
  };

  const isImageFile = (file: File) => {
    return ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type);
  };

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/berich/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (res.ok) {
        alert(data.message || 'Fatura processada com sucesso!');
        fetchTransactions();
      } else {
        alert('Erro: ' + data.error);
      }
    } catch (e) {
      alert('Erro de conexão ao enviar arquivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setScreenshotLoading(true);
    setLoading(true);
    
    // Criar URL para preview da imagem
    const imageUrl = URL.createObjectURL(file);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/berich/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (res.ok) {
        setScreenshotPreview({
          show: true,
          bank: data.bank,
          transactions: data.transactions || [],
          confidence: data.confidence || 0,
          rawText: data.rawText || '',
          imageUrl,
          needsBankSelection: data.needsBankSelection || !data.bank,
          dueDate: format(new Date(), 'yyyy-MM'),
        });
      } else {
        alert('Erro: ' + data.error);
        URL.revokeObjectURL(imageUrl);
      }
    } catch (e) {
      alert('Erro de conexão ao processar imagem.');
      URL.revokeObjectURL(imageUrl);
    } finally {
      setScreenshotLoading(false);
      setLoading(false);
    }
  };

  const confirmScreenshotImport = async () => {
    if (!screenshotPreview) return;
    
    const activeTxs = screenshotPreview.transactions.filter(t => !t._removed);
    if (activeTxs.length === 0) {
      alert('Nenhuma transação para importar.');
      return;
    }
    if (!screenshotPreview.bank) {
      alert('Selecione o banco antes de confirmar.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/berich/api/upload-image/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank: screenshotPreview.bank,
          transactions: activeTxs,
          dueDate: screenshotPreview.dueDate,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        alert(data.message || 'Transações importadas com sucesso!');
        if (screenshotPreview.imageUrl) URL.revokeObjectURL(screenshotPreview.imageUrl);
        setScreenshotPreview(null);
        fetchTransactions();
      } else {
        alert('Erro: ' + data.error);
      }
    } catch (e) {
      alert('Erro ao confirmar importação.');
    } finally {
      setLoading(false);
    }
  };

  const updatePreviewTransaction = (tempId: string, field: string, value: any) => {
    if (!screenshotPreview) return;
    setScreenshotPreview({
      ...screenshotPreview,
      transactions: screenshotPreview.transactions.map(t =>
        t._tempId === tempId ? { ...t, [field]: value } : t
      ),
    });
  };

  const removePreviewTransaction = (tempId: string) => {
    if (!screenshotPreview) return;
    setScreenshotPreview({
      ...screenshotPreview,
      transactions: screenshotPreview.transactions.map(t =>
        t._tempId === tempId ? { ...t, _removed: true } : t
      ),
    });
  };

  const restorePreviewTransaction = (tempId: string) => {
    if (!screenshotPreview) return;
    setScreenshotPreview({
      ...screenshotPreview,
      transactions: screenshotPreview.transactions.map(t =>
        t._tempId === tempId ? { ...t, _removed: false } : t
      ),
    });
  };

  const updateCategory = async (id: string, category: string) => {
    try {
      await fetch('/berich/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, category })
      });
      fetchTransactions();
    } catch (e) {
      console.error(e);
    }
  };

  // ===== EDIT MODAL =====
  const openEditModal = (tx: TransactionData) => {
    setEditModal(tx);
    setEditForm({
      description: tx.description,
      amount: String(tx.amount),
      category: tx.category,
      isInstallment: tx.isInstallment,
      currentInstallment: tx.currentInstallment ? String(tx.currentInstallment) : '',
      totalInstallments: tx.totalInstallments ? String(tx.totalInstallments) : '',
      startMonth: tx.startMonth ? format(new Date(tx.startMonth), 'yyyy-MM') : (tx.invoice?.dueDate ? format(new Date(tx.invoice.dueDate), 'yyyy-MM') : ''),
    });
  };

  const saveEdit = async () => {
    if (!editModal) return;
    try {
      const isProjected = editModal.id === 'projected';
      const payload: any = {
        description: editForm.description,
        amount: parseFloat(editForm.amount),
        category: editForm.category,
        isInstallment: editForm.isInstallment,
        currentInstallment: editForm.isInstallment ? parseInt(editForm.currentInstallment) || 1 : null,
        totalInstallments: editForm.isInstallment ? parseInt(editForm.totalInstallments) || 1 : null,
        startMonth: editForm.startMonth ? `${editForm.startMonth}-01` : null,
      };

      if (!isProjected) {
        payload.id = editModal.id;
      } else {
        payload.bank = editModal.bank || (editModal.invoice?.bank) || 'Manual';
        payload.originalAmount = editModal.originalAmount ?? editModal.amount;
        payload.originalDescription = editModal.originalDescription ?? editModal.description;
        payload.isEdited = true;
      }

      await fetch('/berich/api/transactions', {
        method: isProjected ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setEditModal(null);
      fetchTransactions();
    } catch (e) {
      console.error(e);
    }
  };

  const resolveDivergence = async (action: 'accept_pdf' | 'keep_mine') => {
    if (!editModal) return;
    try {
      await fetch('/berich/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editModal.id,
          resolveDivergence: action,
        })
      });
      setEditModal(null);
      fetchTransactions();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteTransaction = async () => {
    if (!editModal) return;
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;
    try {
      await fetch(`/berich/api/transactions?id=${editModal.id}`, { method: 'DELETE' });
      setEditModal(null);
      fetchTransactions();
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/berich/api/export');
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `berich-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert('Erro ao exportar dados.');
      }
    } catch (e) {
      alert('Erro ao exportar dados.');
    }
  };

  const handleImportClick = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      if (confirm('Atenção: Importar um banco de dados irá APAGAR todos os dados atuais. Deseja continuar?')) {
        const reader = new FileReader();
        reader.onload = async (event: any) => {
          try {
            setLoading(true);
            const content = JSON.parse(event.target.result);
            const res = await fetch('/berich/api/import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(content)
            });
            if (res.ok) {
              alert('Dados importados com sucesso!');
              window.location.reload();
            } else {
              alert('Erro ao importar dados.');
              setLoading(false);
            }
          } catch (error) {
            alert('Arquivo inválido.');
            setLoading(false);
          }
        };
        reader.readAsText(file);
      }
    };
    fileInput.click();
  };

  // ===== ADD MODAL =====
  const openAddModal = () => {
    // Get existing banks from transactions
    setAddForm({
      description: '',
      amount: '',
      category: 'Outros',
      bank: existingBanks[0] || 'Manual',
      isInstallment: false,
      currentInstallment: '1',
      totalInstallments: '2',
      startMonth: format(new Date(), 'yyyy-MM'),
    });
    setAddModal(true);
  };

  const saveAdd = async () => {
    if (!addForm.description.trim() || !addForm.amount) {
      alert('Preencha a descrição e o valor.');
      return;
    }
    try {
      await fetch('/berich/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: addForm.description,
          amount: parseFloat(addForm.amount),
          category: addForm.category,
          bank: addForm.bank || 'Manual',
          isInstallment: addForm.isInstallment,
          currentInstallment: addForm.isInstallment ? parseInt(addForm.currentInstallment) || 1 : null,
          totalInstallments: addForm.isInstallment ? parseInt(addForm.totalInstallments) || 1 : null,
          startMonth: addForm.startMonth ? `${addForm.startMonth}-01` : null,
        })
      });
      setAddModal(false);
      fetchTransactions();
    } catch (e) {
      console.error(e);
    }
  };

  // Get all unique banks from existing transactions
  const existingBanks = Array.from(new Set(
    transactions.map(t => t.bank || t.invoice?.bank || 'N/A').filter(b => b !== 'N/A')
  ));

  // Calcular total
  const totalExpenses = transactions.reduce((acc, t) => acc + (t.amount > 0 ? t.amount : 0), 0);
  const totalCanceled = transactions.reduce((acc, t) => acc + (t.amount < 0 ? t.amount : 0), 0);

  // Calcular destaque para transações recentes (última importação/adição nos últimos 2 minutos)
  let highlightThreshold = 0;
  if (transactions.length > 0) {
    const latest = Math.max(...transactions.map(t => new Date(t.createdAt || 0).getTime()));
    if (Date.now() - latest < 120000) { // 2 minutos
      highlightThreshold = latest - 10000; // janela de 10s para agrupar o batch
    }
  }

  // Lógica do Forecast
  const generateForecast = () => {
    const months: string[] = [];
    const currentDate = new Date();
    
    // Encontrar a data de vencimento mais antiga para começar a tabela
    let earliestDate = currentDate;
    let hasDueDate = false;
    transactions.forEach(t => {
      // Check invoice dueDate
      if (t.invoice?.dueDate) {
        const d = new Date(t.invoice.dueDate);
        if (!hasDueDate || d < earliestDate) {
          earliestDate = d;
          hasDueDate = true;
        }
      }
      // Also check startMonth for manual transactions
      if (t.startMonth) {
        const d = new Date(t.startMonth);
        if (!hasDueDate || d < earliestDate) {
          earliestDate = d;
          hasDueDate = true;
        }
      }
    });

    // Se nenhuma fatura tiver dueDate, começamos 1 mês atrás como fallback
    const startDate = hasDueDate ? earliestDate : addMonths(currentDate, -1);
    
    // Gerar os próximos 10 meses como colunas
    for (let i = 0; i < 10; i++) {
      const d = addMonths(startDate, i);
      months.push(format(d, 'MMM/yy', { locale: ptBR })); // Usar MMM/yy para ficar claro
    }

    const banksResult: Record<string, { rows: any[], totals: any }> = {};
    const grandTotal = {
      general: Array(10).fill(0),
      installments: Array(10).fill(0),
      categories: {} as Record<string, number[]>
    };

    // Agrupar transações por banco
    const txsByBank: Record<string, typeof transactions> = {};
    transactions.forEach(t => {
      let bank = t.bank || t.invoice?.bank || 'N/A';
      if (bank.toLowerCase() === 'nubank') bank = 'Nubank'; // Normalizar nome para evitar tabelas duplicadas
      if (!txsByBank[bank]) txsByBank[bank] = [];
      txsByBank[bank].push(t);
    });

    Object.entries(txsByBank).forEach(([bank, bankTxs]) => {
      const bankQuery = (searchQueries[bank] || '').toLowerCase();
      const filteredBankTxs = bankTxs.filter(t => {
        if (!bankQuery) return true;
        return (
          t.description.toLowerCase().includes(bankQuery) ||
          t.amount.toString().includes(bankQuery) ||
          t.category.toLowerCase().includes(bankQuery)
        );
      });

      const groupedInstallments: Record<string, any[]> = {};
      const groupedNonInstallments: Record<string, any> = {};

      filteredBankTxs.forEach(t => {
        if (t.isInstallment && t.totalInstallments && t.currentInstallment) {
          const normalizedDesc = t.description.replace(/\s+/g, '').toLowerCase();
          const baseAmount = t.originalAmount !== null && t.originalAmount !== undefined ? t.originalAmount : t.amount;
          const key = `${normalizedDesc}_${t.totalInstallments}_${Math.round(baseAmount)}`;
          if (!groupedInstallments[key]) groupedInstallments[key] = [];
          groupedInstallments[key].push(t);
        } else {
          const isRefund = t.amount < -0.01;
          const groupKey = isRefund ? `${t.description}_ESTORNO` : t.description;

          if (!groupedNonInstallments[groupKey]) {
            groupedNonInstallments[groupKey] = {
              description: t.description,
              bank: bank,
              category: isRefund ? 'Estorno' : t.category,
              id: t.id,
              isManual: t.isManual,
              isEdited: t.isEdited,
              hasDivergence: t.hasDivergence,
              originalAmount: t.originalAmount,
              originalDescription: t.originalDescription,
              txData: t,
              values: Array(10).fill(0)
            };
          }
          
          // Calculate offset - use startMonth for manual, invoice.dueDate for imported
          let offset = 0;
          if (t.startMonth) {
            const d = new Date(t.startMonth);
            offset = (d.getFullYear() - startDate.getFullYear()) * 12 + (d.getMonth() - startDate.getMonth());
          } else if (t.invoice?.dueDate) {
            const d = new Date(t.invoice.dueDate);
            offset = (d.getFullYear() - startDate.getFullYear()) * 12 + (d.getMonth() - startDate.getMonth());
          }
          if (offset < 0) offset = 0;
          
          if (offset < 10) {
            groupedNonInstallments[groupKey].values[offset] += t.amount;
          }
        }
      });

      const rows: any[] = [];
      const totals = {
        general: Array(10).fill(0),
        installments: Array(10).fill(0),
        categories: {} as Record<string, number[]>
      };

      // Add non-installments
      Object.values(groupedNonInstallments).forEach(row => {
        if (row.values.some((v: number) => Math.abs(v) > 0.01)) {
          rows.push({
            description: row.description,
            bank: row.bank,
            category: row.category,
            id: row.id,
            values: row.values,
            isInstallment: false,
            isManual: row.isManual,
            isEdited: row.isEdited,
            hasDivergence: row.hasDivergence,
            txData: row.txData,
          });
          if (!totals.categories[row.category]) {
            totals.categories[row.category] = Array(10).fill(0);
          }
          if (!grandTotal.categories[row.category]) {
            grandTotal.categories[row.category] = Array(10).fill(0);
          }
          for (let i = 0; i < 10; i++) {
            totals.general[i] += row.values[i];
            totals.categories[row.category][i] += row.values[i];
            
            grandTotal.general[i] += row.values[i];
            grandTotal.categories[row.category][i] += row.values[i];
          }
        }
      });

      // Add installments
      Object.values(groupedInstallments).forEach(txs => {
        const latestTx = txs.reduce((prev: any, curr: any) => curr.currentInstallment > prev.currentInstallment ? curr : prev);
        const values = Array(10).fill(0);
        
        let highestOffset = -1;
        const txsByOffset: any[] = Array(10).fill(null);

        txs.forEach((t: any) => {
          let offset = 0;
          if (t.startMonth) {
            const d = new Date(t.startMonth);
            offset = (d.getFullYear() - startDate.getFullYear()) * 12 + (d.getMonth() - startDate.getMonth());
          } else if (t.invoice?.dueDate) {
            const d = new Date(t.invoice.dueDate);
            offset = (d.getFullYear() - startDate.getFullYear()) * 12 + (d.getMonth() - startDate.getMonth());
          }
          if (offset < 0) offset = 0;
          if (offset < 10) {
            values[offset] += t.amount;
            txsByOffset[offset] = t;
          }
          if (offset > highestOffset) {
            highestOffset = offset;
          }
        });

        const remaining = latestTx.totalInstallments - latestTx.currentInstallment;
        for (let i = 1; i <= remaining; i++) {
          const idx = highestOffset + i;
          if (idx >= 0 && idx < 10) {
            values[idx] = latestTx.amount;
          }
        }

        for (let i = 0; i < 10; i++) {
          totals.general[i] += values[i];
          totals.installments[i] += values[i];
          
          grandTotal.general[i] += values[i];
          grandTotal.installments[i] += values[i];
        }
        
        const txsInHighestOffset = txs.filter((t: any) => {
          let offset = 0;
          if (t.startMonth) {
            const d = new Date(t.startMonth);
            offset = (d.getFullYear() - startDate.getFullYear()) * 12 + (d.getMonth() - startDate.getMonth());
          } else if (t.invoice?.dueDate) {
            const d = new Date(t.invoice.dueDate);
            offset = (d.getFullYear() - startDate.getFullYear()) * 12 + (d.getMonth() - startDate.getMonth());
          }
          if (offset < 0) offset = 0;
          return offset === highestOffset;
        });

        let descSuffix = `(${latestTx.currentInstallment}/${latestTx.totalInstallments})`;
        if (txsInHighestOffset.length > 1) {
          const minInst = Math.min(...txsInHighestOffset.map((t: any) => t.currentInstallment));
          const maxInst = Math.max(...txsInHighestOffset.map((t: any) => t.currentInstallment));
          if (minInst !== maxInst) {
            descSuffix = `(${minInst} até ${maxInst}/${latestTx.totalInstallments})`;
          }
        }

        if (values.some(v => Math.abs(v) > 0.01)) {
          rows.push({
            description: `${latestTx.description} ${descSuffix}`,
            bank: latestTx.bank || latestTx.invoice?.bank || 'N/A',
            category: latestTx.category,
            id: latestTx.id,
            values,
            txsByOffset,
            highestOffset,
            startDate, // Pass startDate for date calculations
            isInstallment: true,
            isManual: latestTx.isManual,
            isEdited: latestTx.isEdited,
            hasDivergence: latestTx.hasDivergence,
            txData: latestTx,
          });
        }
      });

      // Pre-calcular a base de ordenação para agrupar
      rows.forEach(r => {
        (r as any).sortBase = r.isInstallment 
          ? r.description.split(' (')[0].replace(/\s+/g, '').toLowerCase() 
          : r.description.replace(/\s+/g, '').toLowerCase();
      });

      // Lidar com o caso específico do Itaú: CANCPARCELAS
      const cancRows = rows.filter(r => (r as any).sortBase.includes('cancparcelas'));
      const normalInstRows = rows.filter(r => r.isInstallment && !(r as any).sortBase.includes('cancparcelas'));

      cancRows.forEach(canc => {
        const cancAmount = Math.max(...canc.values.map((v: number) => Math.abs(v)));
        const match = normalInstRows.find(n => {
           const nAmount = Math.max(...n.values.map((v: number) => Math.abs(v)));
           return Math.abs(nAmount - cancAmount) < 0.01;
        });
        if (match) {
          (canc as any).sortBase = (match as any).sortBase;
        }
      });

      const installmentBaseNames = new Set(
        rows.filter(r => r.isInstallment).map(r => (r as any).sortBase)
      );

      rows.sort((a, b) => {
        const baseA = (a as any).sortBase;
        const baseB = (b as any).sortBase;
        
        const aIsRefund = !a.isInstallment && a.values.some((v: number) => v < -0.01);
        const bIsRefund = !b.isInstallment && b.values.some((v: number) => v < -0.01);

        const aIsInstGroup = a.isInstallment || (installmentBaseNames.has(baseA) && aIsRefund);
        const bIsInstGroup = b.isInstallment || (installmentBaseNames.has(baseB) && bIsRefund);

        if (aIsInstGroup && !bIsInstGroup) return -1;
        if (!aIsInstGroup && bIsInstGroup) return 1;

        const comp = baseA.localeCompare(baseB);
        if (comp !== 0) return comp;

        // Se for a mesma compra, o estorno/cancelamento fica embaixo
        const aSum = a.values.reduce((sum: number, v: number) => sum + v, 0);
        const bSum = b.values.reduce((sum: number, v: number) => sum + v, 0);
        if (aSum > 0 && bSum < 0) return -1;
        if (aSum < 0 && bSum > 0) return 1;

        if (a.isInstallment && !b.isInstallment) return -1;
        if (!a.isInstallment && b.isInstallment) return 1;
        
        return a.description.localeCompare(b.description);
      });

      banksResult[bank] = { rows, totals };
    });

    return { months, banks: banksResult, grandTotal };
  };

  const forecast = generateForecast();

  // Helper to get row class
  const getRowClass = (row: any) => {
    const classes = ['row-clickable'];
    if (row.hasDivergence) classes.push('row-divergence');
    else if (row.isManual) classes.push('row-manual');
    else if (row.isEdited) classes.push('row-edited');
    return classes.join(' ');
  };

  return (
    <main style={{ padding: '40px', maxWidth: '100%', margin: '0' }}>
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="animate-fade-in">
        <div>
          <h1 style={{ fontSize: '3rem', marginBottom: '8px' }}>BeRich.</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Organização Inteligente do seu Dinheiro</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            onClick={openAddModal}
            className="btn-primary"
            style={{ fontSize: '0.9rem' }}
          >
            + Adicionar Despesa
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{ 
              padding: '10px 20px', 
              background: 'var(--bg-secondary)', 
              color: 'white', 
              border: '1px solid var(--glass-border)', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
          >
             Gerenciar Categorias
          </button>
          <button 
            onClick={handleExport}
            style={{ 
              padding: '10px 20px', 
              background: 'var(--bg-secondary)', 
              color: 'white', 
              border: '1px solid var(--glass-border)', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
          >
             Exportar
          </button>
          <button 
            onClick={handleImportClick}
            style={{ 
              padding: '10px 20px', 
              background: 'var(--bg-secondary)', 
              color: 'white', 
              border: '1px solid var(--glass-border)', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
          >
             Importar
          </button>
          <button 
            onClick={async () => {
               if (confirm('Tem certeza que deseja apagar todos os dados do sistema? Essa ação não pode ser desfeita.')) {
                   setLoading(true);
                   await fetch('/berich/api/clear', { method: 'DELETE' });
                   window.location.reload();
               }
            }}
            style={{ 
              padding: '10px 20px', 
              background: 'var(--danger)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: 'bold',
              transition: 'opacity 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          >
             Limpar Tudo
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '40px' }}>
        {/* Painel de Upload */}
        <section className="glass-panel animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h2 style={{ marginBottom: '24px', fontSize: '1.5rem' }}>Importar Fatura</h2>
          
          <div 
            className={`drop-zone ${isDragging ? 'active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="drop-zone-icon">{screenshotLoading ? '⏳' : '📄'}</div>
            <h3>{loading ? (screenshotLoading ? 'Processando imagem (OCR)...' : 'Processando...') : 'Arraste PDF ou Screenshot aqui'}</h3>
            <p style={{ color: 'var(--text-tertiary)', marginTop: '8px' }}>PDF de fatura ou print do app bancário (PNG, JPG)</p>
            {screenshotLoading && (
              <div className="ocr-progress">
                <div className="ocr-progress-bar"></div>
              </div>
            )}
            <input 
              type="file" 
              accept=".pdf,image/png,image/jpeg,image/jpg,image/webp" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange}
            />
          </div>

          {/* Legend */}
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              <div style={{ width: '16px', height: '3px', background: '#3b82f6', borderRadius: '2px' }}></div>
              Manual
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              <div style={{ width: '16px', height: '3px', background: 'var(--accent-primary)', borderRadius: '2px' }}></div>
              Editada
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              <div style={{ width: '16px', height: '3px', background: 'var(--warning)', borderRadius: '2px' }}></div>
              Divergência
            </div>
          </div>
        </section>

        {/* Resumo */}
        <section className="glass-panel animate-fade-in" style={{ animationDelay: '0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '1.5rem' }}>Resumo Geral</h2>
          
          <div style={{ display: 'flex', gap: '24px' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)' }}>Despesas Totais</p>
              <h3 style={{ fontSize: '2.5rem', color: 'var(--danger)' }}>R$ {totalExpenses.toFixed(2)}</h3>
            </div>
            
            <div>
              <p style={{ color: 'var(--text-secondary)' }}>Estornos/Cancelamentos</p>
              <h3 style={{ fontSize: '2.5rem', color: 'var(--success)' }}>R$ {Math.abs(totalCanceled).toFixed(2)}</h3>
            </div>
          </div>
        </section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        {/* Resumo Geral */}
        <section className="glass-panel animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <h2 style={{ marginBottom: '8px', fontSize: '1.5rem' }}>Resumo Geral</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Evolução das suas despesas ao longo dos meses.</p>
          
          <ForecastChart forecast={forecast} />

          <div className="table-container" style={{ overflowX: 'auto', marginTop: '24px' }}>
            <table className="rich-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ width: '30%', padding: '12px', color: 'var(--text-secondary)' }}>Categoria</th>
                  {forecast.months.map(m => (
                    <th key={m} style={{ padding: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Categorias no Resumo Geral */}
                {Object.entries(forecast.grandTotal.categories)
                  .sort((a: any, b: any) => b[1].reduce((sum: number, v: number) => sum + v, 0) - a[1].reduce((sum: number, v: number) => sum + v, 0))
                  .map(([cat, vals]: [string, any]) => (
                  <tr key={cat} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '12px' }}>
                      <span className="badge badge-info" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>{cat}</span>
                    </td>
                    {vals.map((v: number, i: number) => (
                      <td key={i} style={{ padding: '12px', textAlign: 'right', color: Math.abs(v) > 0.01 ? (v < 0 ? '#00e676' : 'var(--text-primary)') : 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                        {Math.abs(v) > 0.01 ? (v < 0 ? `+ R$ ${Math.abs(v).toFixed(2)}` : `- R$ ${v.toFixed(2)}`) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* Total de Parcelas (Resumo) */}
                <tr style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                  <td style={{ padding: '12px', paddingLeft: '24px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Total Parceladas</td>
                  {forecast.grandTotal.installments.map((v: number, i: number) => (
                    <td key={i} style={{ padding: '12px', textAlign: 'right', color: Math.abs(v) > 0.01 ? (v < 0 ? '#00e676' : 'var(--text-secondary)') : 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                      {Math.abs(v) > 0.01 ? (v < 0 ? `+ R$ ${Math.abs(v).toFixed(2)}` : `- R$ ${v.toFixed(2)}`) : '-'}
                    </td>
                  ))}
                </tr>
                {/* Total Geral da Fatura */}
                <tr style={{ borderTop: '2px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', fontSize: '1.1rem' }}>TOTAL GERAL</td>
                  {forecast.grandTotal.general.map((v: number, i: number) => (
                    <td key={i} style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: Math.abs(v) > 0.01 ? (v < 0 ? '#00e676' : 'var(--danger)') : 'var(--text-tertiary)', whiteSpace: 'nowrap', fontSize: '1.1rem' }}>
                      {Math.abs(v) > 0.01 ? (v < 0 ? `+ R$ ${Math.abs(v).toFixed(2)}` : `- R$ ${v.toFixed(2)}`) : '-'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Tabelas por Banco */}
        {Object.entries(forecast.banks).map(([bankName, bankData], index) => (
          <section key={bankName} className="glass-panel animate-fade-in" style={{ animationDelay: `${0.4 + index * 0.1}s` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>Fatura {bankName}</h2>
              <input 
                type="text" 
                placeholder={`🔍 Buscar em ${bankName}...`} 
                className="form-input" 
                style={{ width: '250px', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', border: '1px solid var(--glass-border)', fontSize: '0.9rem' }}
                value={searchQueries[bankName] || ''}
                onChange={e => setSearchQueries({ ...searchQueries, [bankName]: e.target.value })}
              />
            </div>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="rich-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ width: '30%', padding: '12px', color: 'var(--text-secondary)' }}>Descrição</th>
                    <th style={{ width: '15%', padding: '12px', color: 'var(--text-secondary)' }}>Categoria</th>
                    {forecast.months.map(m => (
                      <th key={m} style={{ padding: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bankData.rows.length === 0 ? (
                    <tr><td colSpan={12} style={{ padding: '12px', textAlign: 'center', color: 'var(--text-tertiary)' }}>Nenhuma parcela detectada.</td></tr>
                  ) : (
                    <>
                      {bankData.rows.map((row: any, i: number) => {
                        const isRecent = row.txData?.createdAt && (new Date(row.txData.createdAt).getTime() > highlightThreshold) && highlightThreshold > 0;
                        return (
                        <tr 
                          key={`${row.id}-${i}`} 
                          className={`${getRowClass(row)} ${isRecent ? 'highlight-recent' : ''}`}
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}
                          onClick={() => row.txData && openEditModal(row.txData)}
                        >
                          <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                            {row.isInstallment ? <span className="badge badge-info" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>PARC</span> : <span className="badge badge-info" style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', color: 'white' }}>À VISTA</span>}
                            <span style={{ flex: 1, opacity: row.values.every((v: number) => Math.abs(v) < 0.01) ? 0.5 : 1 }}>
                              {row.description}
                              {row.hasDivergence && <span style={{ marginLeft: '6px', color: 'var(--warning)', fontSize: '0.8rem' }}>⚠</span>}
                              {row.isManual && <span style={{ marginLeft: '6px', color: '#3b82f6', fontSize: '0.7rem' }}>✎</span>}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }} onClick={(e) => e.stopPropagation()}>
                            {!row.isInstallment && row.category !== 'Estorno' ? (
                              <select 
                                  value={row.category} 
                                  onChange={(e) => updateCategory(row.id, e.target.value)}
                                  style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'white',
                                    border: '1px solid var(--glass-border)',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem'
                                  }}
                                >
                                  {categories.map(c => <option key={c} value={c} style={{ background: '#1e1e1e', color: 'white' }}>{c}</option>)}
                              </select>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {row.isInstallment 
                                  ? (row.values.some((v: number) => v < -0.01) ? 'Estorno' : 'Compras Parceladas') 
                                  : 'Estorno'}
                              </span>
                            )}
                          </td>
                          {row.values.map((v: number, j: number) => {
                            const isProjected = row.isInstallment && j > row.highestOffset;
                            let overrideTx = row.isInstallment ? row.txsByOffset[j] : row.txData;
                            
                            if (!overrideTx && isProjected) {
                              const diffMonths = j - row.highestOffset;
                              const currInst = row.txData.currentInstallment + diffMonths;
                              const targetDate = addMonths(row.startDate || new Date(), j);
                              
                              overrideTx = {
                                ...row.txData,
                                id: 'projected',
                                amount: v,
                                originalAmount: row.txData.originalAmount ?? row.txData.amount,
                                originalDescription: row.txData.originalDescription ?? row.txData.description,
                                currentInstallment: currInst,
                                startMonth: targetDate.toISOString(),
                              };
                            }
                            
                            return (
                              <td 
                                key={j} 
                                style={{ 
                                  padding: '12px', 
                                  textAlign: 'right', 
                                  color: Math.abs(v) > 0.01 ? (v < 0 ? '#00e676' : 'var(--text-primary)') : 'var(--text-tertiary)', 
                                  whiteSpace: 'nowrap',
                                  cursor: overrideTx ? 'pointer' : 'default',
                                  position: 'relative'
                                }}
                                onClick={(e) => {
                                  if (overrideTx) {
                                    e.stopPropagation();
                                    openEditModal(overrideTx);
                                  }
                                }}
                                title={isProjected ? 'Valor projetado. Clique para sobrepor.' : 'Clique para editar este mês'}
                              >
                                {Math.abs(v) > 0.01 ? (v < 0 ? `+ R$ ${Math.abs(v).toFixed(2)}` : `- R$ ${v.toFixed(2)}`) : '-'}
                                {row.isInstallment && overrideTx && overrideTx.isEdited && overrideTx.id !== 'projected' && <span style={{ marginLeft: '4px', color: '#3b82f6', fontSize: '0.6rem', verticalAlign: 'top' }}>✎</span>}
                                {isProjected && Math.abs(v) > 0.01 && <span style={{ marginLeft: '4px', color: 'var(--text-tertiary)', fontSize: '0.6rem', verticalAlign: 'top' }}>⧖</span>}
                              </td>
                            );
                          })}
                        </tr>
                        );
                      })}
                      
                      {/* Totais do Banco por Categoria */}
                      {Object.entries(bankData.totals.categories)
                        .sort((a: any, b: any) => b[1].reduce((sum: number, v: number) => sum + v, 0) - a[1].reduce((sum: number, v: number) => sum + v, 0))
                        .map(([cat, vals]: [string, any]) => (
                        <tr key={cat} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                          <td colSpan={2} style={{ padding: '12px', paddingLeft: '24px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Total {cat}</td>
                          {vals.map((v: number, i: number) => (
                            <td key={i} style={{ padding: '12px', textAlign: 'right', color: Math.abs(v) > 0.01 ? (v < 0 ? '#00e676' : 'var(--text-secondary)') : 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                              {Math.abs(v) > 0.01 ? (v < 0 ? `+ R$ ${Math.abs(v).toFixed(2)}` : `- R$ ${v.toFixed(2)}`) : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                      
                      {/* Total de Parcelas do Banco */}
                      <tr style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                        <td colSpan={2} style={{ padding: '12px', paddingLeft: '24px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Total Parceladas</td>
                        {bankData.totals.installments.map((v: number, i: number) => (
                          <td key={i} style={{ padding: '12px', textAlign: 'right', color: Math.abs(v) > 0.01 ? (v < 0 ? '#00e676' : 'var(--text-secondary)') : 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                            {Math.abs(v) > 0.01 ? (v < 0 ? `+ R$ ${Math.abs(v).toFixed(2)}` : `- R$ ${v.toFixed(2)}`) : '-'}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Total Geral do Banco */}
                      <tr style={{ borderTop: '2px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)' }}>
                        <td colSpan={2} style={{ padding: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', fontSize: '1.1rem' }}>TOTAL {bankName}</td>
                        {bankData.totals.general.map((v: number, i: number) => (
                          <td key={i} style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: Math.abs(v) > 0.01 ? (v < 0 ? '#00e676' : 'var(--danger)') : 'var(--text-tertiary)', whiteSpace: 'nowrap', fontSize: '1.1rem' }}>
                            {Math.abs(v) > 0.01 ? (v < 0 ? `+ R$ ${Math.abs(v).toFixed(2)}` : `- R$ ${v.toFixed(2)}`) : '-'}
                          </td>
                        ))}
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      {/* Modal Gerenciar Categorias */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="glass-panel animate-fade-in" style={{ width: '400px', padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Categorias</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input 
                type="text" 
                value={newCategoryName} 
                onChange={e => setNewCategoryName(e.target.value)} 
                placeholder="Nova categoria..." 
                className="form-input"
                style={{ flex: 1 }}
                onKeyDown={e => e.key === 'Enter' && addCategory()}
              />
              <button 
                onClick={addCategory}
                className="btn-save"
              >
                Adicionar
              </button>
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {categories.map(c => (
                <div key={c} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span>{c}</span>
                  {c !== 'Outros' && (
                    <button onClick={() => deleteCategory(c)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 'bold' }}>Excluir</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Transação */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="glass-panel animate-fade-in" style={{ width: '480px', padding: '30px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0 }}>
                Editar Transação
                {editModal.isManual && <span className="badge" style={{ marginLeft: '10px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontSize: '0.65rem' }}>MANUAL</span>}
                {editModal.isEdited && !editModal.hasDivergence && <span className="badge" style={{ marginLeft: '10px', background: 'rgba(139,92,246,0.15)', color: 'var(--accent-primary)', fontSize: '0.65rem' }}>EDITADA</span>}
              </h2>
              <button onClick={() => setEditModal(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>

            {/* Divergence Alert */}
            {editModal.hasDivergence && (
              <div className="divergence-box" style={{ marginBottom: '16px' }}>
                <p><strong>⚠ Divergência detectada</strong></p>
                <p>Valor na fatura (PDF): <strong>R$ {editModal.originalAmount?.toFixed(2)}</strong></p>
                <p>Seu valor editado: <strong>R$ {editModal.amount.toFixed(2)}</strong></p>
                {editModal.originalDescription && editModal.originalDescription !== editModal.description && (
                  <p>Descrição no PDF: <strong>{editModal.originalDescription}</strong></p>
                )}
                <div className="divergence-actions">
                  <button className="btn-resolve btn-accept-pdf" onClick={() => resolveDivergence('accept_pdf')}>
                    Aceitar valor do PDF
                  </button>
                  <button className="btn-resolve btn-keep-mine" onClick={() => resolveDivergence('keep_mine')}>
                    Manter meu valor
                  </button>
                </div>
              </div>
            )}
            
            <div className="modal-form">
              <div className="form-group">
                <label>Descrição</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="form-input"
                    value={editForm.amount}
                    onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Categoria</label>
                  <select 
                    className="form-input"
                    value={editForm.category}
                    onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                  >
                    {categories.map(c => <option key={c} value={c} style={{ background: '#1e1e1e', color: 'white' }}>{c}</option>)}
                  </select>
                </div>
              </div>

              <label className="form-toggle">
                <input 
                  type="checkbox" 
                  checked={editForm.isInstallment}
                  onChange={e => setEditForm({ ...editForm, isInstallment: e.target.checked })}
                />
                <span>É parcelamento?</span>
              </label>

              {editForm.isInstallment && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Parcela atual</label>
                    <input 
                      type="number" 
                      className="form-input"
                      value={editForm.currentInstallment}
                      onChange={e => setEditForm({ ...editForm, currentInstallment: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Total de parcelas</label>
                    <input 
                      type="number" 
                      className="form-input"
                      value={editForm.totalInstallments}
                      onChange={e => setEditForm({ ...editForm, totalInstallments: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Mês de início</label>
                <input 
                  type="month" 
                  className="form-input"
                  value={editForm.startMonth}
                  onChange={e => setEditForm({ ...editForm, startMonth: e.target.value })}
                />
              </div>

              <div className="modal-buttons">
                <button className="btn-delete" onClick={deleteTransaction}>
                  🗑 Excluir
                </button>
                <button className="btn-cancel" onClick={() => setEditModal(null)}>
                  Cancelar
                </button>
                <button className="btn-save" onClick={saveEdit}>
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar Transação */}
      {addModal && (
        <div className="modal-overlay" onClick={() => setAddModal(false)}>
          <div className="glass-panel animate-fade-in" style={{ width: '480px', padding: '30px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0 }}>Adicionar Despesa</h2>
              <button onClick={() => setAddModal(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <div className="modal-form">
              <div className="form-group">
                <label>Descrição *</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="Ex: Netflix, Aluguel, etc."
                  value={addForm.description}
                  onChange={e => setAddForm({ ...addForm, description: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Valor (R$) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                    value={addForm.amount}
                    onChange={e => setAddForm({ ...addForm, amount: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Banco / Cartão</label>
                  <select 
                    className="form-input"
                    value={addForm.bank}
                    onChange={e => setAddForm({ ...addForm, bank: e.target.value })}
                  >
                    {existingBanks.map(b => <option key={b} value={b} style={{ background: '#1e1e1e', color: 'white' }}>{b}</option>)}
                    <option value="Manual" style={{ background: '#1e1e1e', color: 'white' }}>Outro</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Categoria</label>
                <select 
                  className="form-input"
                  value={addForm.category}
                  onChange={e => setAddForm({ ...addForm, category: e.target.value })}
                >
                  {categories.map(c => <option key={c} value={c} style={{ background: '#1e1e1e', color: 'white' }}>{c}</option>)}
                </select>
              </div>

              <label className="form-toggle">
                <input 
                  type="checkbox" 
                  checked={addForm.isInstallment}
                  onChange={e => setAddForm({ ...addForm, isInstallment: e.target.checked })}
                />
                <span>É parcelamento?</span>
              </label>

              {addForm.isInstallment && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Parcela atual</label>
                    <input 
                      type="number" 
                      className="form-input"
                      value={addForm.currentInstallment}
                      onChange={e => setAddForm({ ...addForm, currentInstallment: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Total de parcelas</label>
                    <input 
                      type="number" 
                      className="form-input"
                      value={addForm.totalInstallments}
                      onChange={e => setAddForm({ ...addForm, totalInstallments: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Mês de início</label>
                <input 
                  type="month" 
                  className="form-input"
                  value={addForm.startMonth}
                  onChange={e => setAddForm({ ...addForm, startMonth: e.target.value })}
                />
              </div>

              <div className="modal-buttons">
                <button className="btn-cancel" onClick={() => setAddModal(false)}>
                  Cancelar
                </button>
                <button className="btn-save" onClick={saveAdd}>
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview Screenshot */}
      {screenshotPreview?.show && (
        <div className="modal-overlay" onClick={() => {
          if (screenshotPreview.imageUrl) URL.revokeObjectURL(screenshotPreview.imageUrl);
          setScreenshotPreview(null);
        }}>
          <div className="glass-panel animate-fade-in screenshot-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                📸 Preview do Screenshot
                {screenshotPreview.confidence > 0 && (
                  <span className="badge" style={{
                    background: screenshotPreview.confidence > 70 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                    color: screenshotPreview.confidence > 70 ? 'var(--success)' : 'var(--warning)',
                    fontSize: '0.65rem',
                  }}>
                    OCR {Math.round(screenshotPreview.confidence)}%
                  </span>
                )}
              </h2>
              <button onClick={() => {
                if (screenshotPreview.imageUrl) URL.revokeObjectURL(screenshotPreview.imageUrl);
                setScreenshotPreview(null);
              }} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>

            <div className="screenshot-content">
              {/* Lado esquerdo - imagem */}
              <div className="screenshot-image-panel">
                {screenshotPreview.imageUrl && (
                  <img
                    src={screenshotPreview.imageUrl}
                    alt="Screenshot da fatura"
                    className="screenshot-thumbnail"
                  />
                )}
              </div>

              {/* Lado direito - dados extraídos */}
              <div className="screenshot-data-panel">
                {/* Seleção de Banco */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Banco {screenshotPreview.needsBankSelection && <span style={{ color: 'var(--warning)', fontSize: '0.75rem' }}>⚠ Não detectado</span>}</label>
                    <select
                      className="form-input"
                      value={screenshotPreview.bank || ''}
                      onChange={e => setScreenshotPreview({ ...screenshotPreview, bank: e.target.value })}
                    >
                      {!screenshotPreview.bank && <option value="" style={{ background: '#1e1e1e', color: 'white' }}>Selecione o banco...</option>}
                      <option value="Itaú" style={{ background: '#1e1e1e', color: 'white' }}>Itaú</option>
                      <option value="Bradesco" style={{ background: '#1e1e1e', color: 'white' }}>Bradesco</option>
                      <option value="Nubank" style={{ background: '#1e1e1e', color: 'white' }}>Nubank</option>
                      {existingBanks.filter(b => !['Itaú', 'Bradesco', 'Nubank', 'NuBank'].includes(b)).map(b => (
                        <option key={b} value={b} style={{ background: '#1e1e1e', color: 'white' }}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Mês da Fatura</label>
                    <input
                      type="month"
                      className="form-input"
                      value={screenshotPreview.dueDate}
                      onChange={e => setScreenshotPreview({ ...screenshotPreview, dueDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Lista de transações */}
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      Transações Encontradas ({screenshotPreview.transactions.filter(t => !t._removed).length})
                    </label>
                    {screenshotPreview.transactions.length === 0 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--warning)' }}>Nenhuma transação detectada</span>
                    )}
                  </div>

                  <div className="screenshot-transactions-list">
                    {screenshotPreview.transactions.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>
                        <p>Nenhuma transação foi detectada no screenshot.</p>
                        <p style={{ fontSize: '0.8rem', marginTop: '8px' }}>Verifique se a imagem está nítida e se é de um app bancário suportado.</p>
                      </div>
                    ) : (
                      screenshotPreview.transactions.map((t) => (
                        <div
                          key={t._tempId}
                          className={`screenshot-tx-row ${t._removed ? 'removed' : ''}`}
                        >
                          <div className="screenshot-tx-main">
                            <input
                              type="text"
                              className="form-input screenshot-tx-desc"
                              value={t.description}
                              onChange={e => updatePreviewTransaction(t._tempId, 'description', e.target.value)}
                              disabled={t._removed}
                            />
                            <div className="screenshot-tx-amount-wrap">
                              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>R$</span>
                              <input
                                type="number"
                                step="0.01"
                                className="form-input screenshot-tx-amount"
                                value={t.amount}
                                onChange={e => updatePreviewTransaction(t._tempId, 'amount', parseFloat(e.target.value) || 0)}
                                disabled={t._removed}
                              />
                            </div>
                            {t._removed ? (
                              <button
                                className="screenshot-tx-btn restore"
                                onClick={() => restorePreviewTransaction(t._tempId)}
                                title="Restaurar"
                              >↩</button>
                            ) : (
                              <button
                                className="screenshot-tx-btn remove"
                                onClick={() => removePreviewTransaction(t._tempId)}
                                title="Remover"
                              >✕</button>
                            )}
                          </div>
                          {t.isInstallment && (
                            <div className="screenshot-tx-installment">
                              <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                                Parcela {t.currentInstallment}/{t.totalInstallments}
                              </span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Total */}
                {screenshotPreview.transactions.filter(t => !t._removed).length > 0 && (
                  <div style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Total</span>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--danger)' }}>
                      R$ {screenshotPreview.transactions
                        .filter(t => !t._removed)
                        .reduce((sum, t) => sum + t.amount, 0)
                        .toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Botões */}
            <div className="modal-buttons" style={{ marginTop: '20px' }}>
              <button className="btn-cancel" onClick={() => {
                if (screenshotPreview.imageUrl) URL.revokeObjectURL(screenshotPreview.imageUrl);
                setScreenshotPreview(null);
              }}>
                Cancelar
              </button>
              <button
                className="btn-save"
                onClick={confirmScreenshotImport}
                disabled={!screenshotPreview.bank || screenshotPreview.transactions.filter(t => !t._removed).length === 0 || loading}
              >
                {loading ? 'Importando...' : `Confirmar e Importar (${screenshotPreview.transactions.filter(t => !t._removed).length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
