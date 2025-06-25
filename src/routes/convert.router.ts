import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';

const router = Router();
const execAsync = promisify(exec);

router.post('/{*any}', async (req: Request, res: Response): Promise<void> => {
  const { compatibleHtml } = req.body;
  
  if (!compatibleHtml) {
    res.status(400).json({ error: 'compatibleHtml is required' });
    return;
  }

  let htmlFile: string = '';
  let convertedFile: string = '';

  try {
    const tempDir = path.join(process.cwd(), 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    const timestamp = Date.now();
    htmlFile = path.join(tempDir, `input_${timestamp}.html`);
    
    // Write HTML content to file
    await fs.writeFile(htmlFile, compatibleHtml, 'utf8');
    console.log('HTML file written:', htmlFile);
    
    // LibreOffice command with more verbose output
    const command = `libreoffice --headless --convert-to docx:"Office Open XML Text"   --outdir "${tempDir}" "${htmlFile}"`;
    console.log('Executing command:', command);
    
    // Execute with timeout and capture output
    const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
    console.log('LibreOffice stdout:', stdout);
    console.log('LibreOffice stderr:', stderr);
    
    // Wait a bit for file system to sync
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check what files were actually created
    const files = await fs.readdir(tempDir);
    console.log('Files in temp directory:', files);
    
    // Find the converted file - LibreOffice creates filename.docx from filename.html
    const expectedFileName = `input_${timestamp}.docx`;
    convertedFile = path.join(tempDir, expectedFileName);
    
    // Check if the expected file exists
    try {
      await fs.access(convertedFile);
      console.log('Found converted file:', convertedFile);
    } catch (error) {
      // Try to find any .docx file created
      const docxFiles = files.filter(file => file.endsWith('.docx'));
      console.log('Available DOCX files:', docxFiles);
      
      if (docxFiles.length > 0) {
        convertedFile = path.join(tempDir, docxFiles[0]);
        console.log('Using alternative DOCX file:', convertedFile);
      } else {
        throw new Error(`Conversion failed - no DOCX file found. Available files: ${files.join(', ')}`);
      }
    }
    
    // Verify file is not empty
    const stats = await fs.stat(convertedFile);
    if (stats.size === 0) {
      throw new Error('Converted file is empty');
    }
    
    console.log(`Converted file size: ${stats.size} bytes`);
    
    const downloadFilename = `document_${timestamp}.docx`;
    
    res.download(convertedFile, downloadFilename, async (err) => {
      // Clean up files
      const cleanupPromises = [
        fs.unlink(htmlFile).catch(e => console.log('Failed to delete HTML file:', e.message)),
        fs.unlink(convertedFile).catch(e => console.log('Failed to delete DOCX file:', e.message))
      ];
      
      await Promise.all(cleanupPromises);
      
      if (err) {
        console.error('Download error:', err);
      } else {
        console.log('File downloaded successfully');
      }
    });
    
  } catch (error: any) {
    console.error('Conversion error:', error);
    
    // Clean up files on error
    const cleanupPromises = [];
    if (htmlFile) {
      cleanupPromises.push(fs.unlink(htmlFile).catch(() => {}));
    }
    if (convertedFile) {
      cleanupPromises.push(fs.unlink(convertedFile).catch(() => {}));
    }
    
    await Promise.all(cleanupPromises);
    
    // Send appropriate error response
    if (error.message.includes('libreoffice') || error.code === 'ENOENT') {
      res.status(500).json({ 
        error: 'LibreOffice is not installed or not accessible',
        details: error.message 
      });
    } else if (error.message.includes('timeout')) {
      res.status(500).json({ 
        error: 'Conversion timeout - file too large or complex',
        details: error.message 
      });
    } else {
      res.status(500).json({ 
        error: 'Conversion failed', 
        details: error.message 
      });
    }
  }
});

export default router;