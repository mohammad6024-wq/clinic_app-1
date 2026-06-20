export const exportToPDF = async (elementId: string, filename: string) => {
  const sourceElement = document.getElementById(elementId);
  if (!sourceElement) {
    console.error("Printable element not found");
    return;
  }

  // Set document title temporarily to the desired filename
  const originalTitle = document.title;
  document.title = filename;

  // Create a print container
  const printContainer = document.createElement('div');
  printContainer.id = 'global-print-container';
  
  // Clone the source element
  const clone = sourceElement.cloneNode(true) as HTMLElement;
  
  // Clean up elements that shouldn't be printed
  const hiddenElements = clone.querySelectorAll('.print\\:hidden, .no-print');
  hiddenElements.forEach(el => el.parentNode?.removeChild(el));

  printContainer.appendChild(clone);
  document.body.appendChild(printContainer);

  // Inject print styles
  const style = document.createElement('style');
  style.id = 'global-print-style';
  style.innerHTML = `
    @media screen {
      #global-print-container {
        display: none !important;
      }
    }
    @media print {
      body > *:not(#global-print-container):not(#global-print-style) {
        display: none !important;
      }
      #global-print-container {
        display: block !important;
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        margin: 0;
        padding: 0;
        background: white;
      }
      /* Ensure everything inside print container is visible */
      #global-print-container * {
        visibility: visible;
      }
      @page {
        margin: 10mm;
      }
    }
  `;
  document.head.appendChild(style);

  // Small timeout to allow DOM to render the clone
  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    window.print();
  } catch (error) {
    console.error("Error during print dialog:", error);
  } finally {
    // Cleanup
    document.title = originalTitle;
    if (document.body.contains(printContainer)) {
      document.body.removeChild(printContainer);
    }
    if (document.head.contains(style)) {
      document.head.removeChild(style);
    }
  }
};
