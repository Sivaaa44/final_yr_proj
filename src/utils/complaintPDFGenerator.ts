import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { ComplaintData } from './complaintWizard';
import { Language } from '../types';

if (pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
  pdfMake.vfs = pdfFonts.pdfMake.vfs;
}

const fonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
};

pdfMake.fonts = fonts;

const labels: Record<string, {
  title: string;
  from: string;
  to: string;
  subject: string;
  subjectText: string;
  incidentHeading: string;
  reliefHeading: string;
  declaration: string;
  datePlace: string;
  signature: string;
}> = {
  en: {
    title: 'COMPLAINT LETTER',
    from: 'From',
    to: 'To',
    subject: 'Subject',
    subjectText: 'Complaint regarding the incident mentioned below',
    incidentHeading: 'Details of Incident / Grievance:',
    reliefHeading: 'Relief / Action Requested:',
    declaration: 'I hereby solemnly affirm that the facts stated above are true to the best of my knowledge and belief.',
    datePlace: 'Date',
    signature: 'Signature of Complainant',
  },
  hi: {
    title: 'शिकायत पत्र',
    from: 'प्रेषक',
    to: 'प्रति',
    subject: 'विषय',
    subjectText: 'नीचे उल्लिखित घटना के संबंध में शिकायत',
    incidentHeading: 'घटना/शिकायत का विवरण:',
    reliefHeading: 'मांगी गई राहत/कार्रवाई:',
    declaration: 'मैं सत्यनिष्ठापूर्वक घोषणा करता/करती हूं कि उपरोक्त सभी तथ्य सत्य और सही हैं।',
    datePlace: 'तारीख',
    signature: 'शिकायतकर्ता के हस्ताक्षर',
  },
};

export const generateComplaintPDF = (data: ComplaintData, lang: Language): void => {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const l = labels[lang] || labels['en'];

  const docDefinition: any = {
    content: [
      // Title
      {
        text: l.title,
        style: 'header',
        alignment: 'center',
        margin: [0, 0, 0, 24],
      },
      // From block
      {
        text: `${l.from}:`,
        style: 'sectionHeader',
        margin: [0, 0, 0, 4],
      },
      {
        text: data.fullName,
        margin: [0, 0, 0, 2],
      },
      {
        text: data.address,
        margin: [0, 0, 0, 16],
        color: '#444444',
      },
      // To block
      {
        text: `${l.to}:`,
        style: 'sectionHeader',
        margin: [0, 0, 0, 4],
      },
      {
        text: data.authority,
        margin: [0, 0, 0, 20],
      },
      // Subject
      {
        text: `${l.subject}: ${l.subjectText}`,
        bold: true,
        margin: [0, 0, 0, 20],
      },
      // Separator
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#AAAAAA' }], margin: [0, 0, 0, 16] },
      // Incident details
      {
        text: l.incidentHeading,
        style: 'sectionHeader',
        margin: [0, 0, 0, 8],
      },
      {
        text: data.incident,
        margin: [0, 0, 0, 20],
        lineHeight: 1.5,
      },
      // Relief
      {
        text: l.reliefHeading,
        style: 'sectionHeader',
        margin: [0, 0, 0, 8],
      },
      {
        text: data.reliefSought,
        margin: [0, 0, 0, 24],
        lineHeight: 1.5,
      },
      // Declaration
      {
        text: l.declaration,
        italics: true,
        fontSize: 10,
        color: '#555555',
        margin: [0, 0, 0, 32],
      },
      // Signature block
      {
        columns: [
          {
            stack: [
              { text: `${l.datePlace}: ${currentDate}`, fontSize: 10 },
            ],
            width: '*',
          },
          {
            stack: [
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 160, y2: 0, lineWidth: 1, lineColor: '#333333' }] },
              { text: l.signature, fontSize: 9, margin: [0, 4, 0, 0], color: '#555555' },
              { text: data.fullName, margin: [0, 2, 0, 0], fontSize: 10, bold: true },
            ],
            width: 'auto',
            alignment: 'right',
          },
        ],
      },
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        color: '#1E3A5F',
        letterSpacing: 2,
      },
      sectionHeader: {
        fontSize: 11,
        bold: true,
        color: '#3b82f6',
      },
    },
    defaultStyle: {
      font: 'Roboto',
      fontSize: 11,
      lineHeight: 1.4,
    },
    pageMargins: [60, 60, 60, 60],
  };

  const pdfDoc = pdfMake.createPdf(docDefinition);
  pdfDoc.download(`Complaint_Letter_${currentDate.replace(/\s/g, '_')}.pdf`);
};
