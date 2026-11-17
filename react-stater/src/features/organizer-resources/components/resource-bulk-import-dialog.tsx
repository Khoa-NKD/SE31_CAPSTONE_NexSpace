import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, Download, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface ResourceBulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess: () => void;
}

function handleDownloadSample() {
  toast.success('Sample Template Downloaded', {
    description: 'Downloaded nexspace-floor12-inventory-template.csv'
  });
}

export function ResourceBulkImportDialog({
  open,
  onOpenChange,
  onImportSuccess
}: ResourceBulkImportDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSimulatedDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setSelectedFileName('Floor12_Resource_Inventory_Batch_2026.csv');
  };

  const handleConfirmImport = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onImportSuccess();
      onOpenChange(false);
      setSelectedFileName(null);
      toast.success('Bulk Import Succeeded', {
        description: 'Successfully verified and imported 47 inventory units onto Floor 12.'
      });
    }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[480px] p-5'>
        <DialogHeader>
          <DialogTitle className='text-lg font-bold flex items-center gap-2'>
            <FileSpreadsheet className='size-5 text-primary' />
            <span>Quick Bulk Import Resources</span>
          </DialogTitle>
          <DialogDescription className='text-xs'>
            Upload a standard CSV or Excel file to batch-provision desks, pods, and rooms across Floor 12.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2 text-xs'>
          {/* Dropzone Button */}
          <button
            type='button'
            aria-label='Upload CSV dropzone'
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleSimulatedDrop}
            onClick={() => setSelectedFileName('Floor12_Resource_Inventory_Batch_2026.csv')}
            className={`w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isDragging
                ? 'border-primary bg-primary/5'
                : selectedFileName
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-border hover:border-muted-foreground/40 bg-muted/20'
            }`}
          >
            {selectedFileName ? (
              <>
                <div className='size-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center'>
                  <CheckCircle2 className='size-5' />
                </div>
                <div>
                  <p className='font-semibold text-foreground text-xs'>{selectedFileName}</p>
                  <p className='text-[11px] text-muted-foreground'>47 resources detected • UTF-8 CSV</p>
                </div>
              </>
            ) : (
              <>
                <div className='size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center'>
                  <Upload className='size-5' />
                </div>
                <div>
                  <p className='font-semibold text-foreground text-xs'>
                    Drag and drop file here, or click to browse
                  </p>
                  <p className='text-[11px] text-muted-foreground mt-0.5'>
                    Supports .CSV, .XLSX (Max file size: 10MB)
                  </p>
                </div>
              </>
            )}
          </button>

          {/* Sample template download link */}
          <div className='flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border'>
            <div className='flex items-center gap-2'>
              <FileSpreadsheet className='size-4 text-muted-foreground' />
              <div className='text-left'>
                <p className='font-medium text-foreground text-[11px]'>Download CSV Template</p>
                <p className='text-[10px] text-muted-foreground'>Includes pre-mapped columns and sample entries</p>
              </div>
            </div>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleDownloadSample}
              className='h-7 px-2.5 text-[11px] gap-1'
            >
              <Download className='size-3' />
              <span>Template</span>
            </Button>
          </div>
        </div>

        <DialogFooter className='pt-2 gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => onOpenChange(false)}
            className='text-xs'
          >
            Cancel
          </Button>
          <Button
            type='button'
            size='sm'
            disabled={!selectedFileName || isProcessing}
            onClick={handleConfirmImport}
            className='text-xs font-semibold gap-1.5'
          >
            {isProcessing ? 'Importing...' : 'Confirm Import (47 Units)'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

