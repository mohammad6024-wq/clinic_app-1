import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const exportToExcelHTML = async (filename: string, title: string, headers: string[], rows: any[][]) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('گزارش', {
    views: [{ rightToLeft: true }] // This sets RTL natively for supported viewers
  });

  // Adding the Title Row
  const titleRow = worksheet.addRow([title]);
  worksheet.mergeCells(1, 1, 1, headers.length);
  titleRow.height = 30;
  const titleCell = titleRow.getCell(1);
  titleCell.font = { name: 'Tahoma', size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Adding Headers
  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Tahoma' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  // Adding Data Rows
  rows.forEach((row, rowIndex) => {
    const dataRow = worksheet.addRow(row.map(cell => cell !== null && cell !== undefined ? cell : ''));
    dataRow.eachCell((cell) => {
      cell.font = { name: 'Tahoma' };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowIndex % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF' }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
    });
  });

  // Auto-fit Columns width
  worksheet.columns.forEach((column, i) => {
    const headerText = headers[i] || '';
    column.width = Math.max(headerText.length + 5, 12);
  });

  // Generate and save file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const finalFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  saveAs(blob, finalFilename);
};

