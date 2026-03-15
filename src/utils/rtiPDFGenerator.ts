import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { RTIData } from './rtiWizard';
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

const labels = {
  en: {
    title: 'Application under the Right to Information Act, 2005',
    to: 'To',
    pio: 'Public Information Officer (PIO)',
    subject: 'Subject',
    subjectText: 'Request for information under RTI Act, 2005',
    informationSought: 'Information sought',
    reason: 'Reason (optional)',
    applicantDetails: 'Applicant details',
    name: 'Name',
    address: 'Address for correspondence',
    declaration: 'I declare that the information sought is for personal use and does not involve any commercial interest.',
    datePlace: 'Date and place',
    signature: 'Signature',
  },
  hi: {
    title: 'सूचना का अधिकार अधिनियम, 2005 के तहत आवेदन',
    to: 'प्रति',
    pio: 'लोक सूचना अधिकारी (PIO)',
    subject: 'विषय',
    subjectText: 'RTI अधिनियम, 2005 के तहत जानकारी का अनुरोध',
    informationSought: 'मांगी गई जानकारी',
    reason: 'कारण (वैकल्पिक)',
    applicantDetails: 'आवेदक विवरण',
    name: 'नाम',
    address: 'पत्राचार का पता',
    declaration: 'मैं घोषणा करता/करती हूं कि मांगी गई जानकारी व्यक्तिगत उपयोग के लिए है।',
    datePlace: 'तारीख और स्थान',
    signature: 'हस्ताक्षर',
  },
};

/**
 * Generate RTI application PDF (something a rural person can file with a public authority)
 */
export const generateRTIPDF = (data: RTIData, lang: Language): void => {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const l = (labels as Record<string, typeof labels.en>)[lang] || labels.en;

  const docDefinition: any = {
    content: [
      {
        text: l.title,
        style: 'header',
        alignment: 'center',
        margin: [0, 0, 0, 20],
      },
      { text: `${l.to}: ${l.pio}`, margin: [0, 0, 0, 5] },
      { text: `${data.publicAuthority}`, margin: [0, 0, 0, 15] },
      { text: `${l.subject}: ${l.subjectText}`, margin: [0, 0, 0, 20] },
      {
        text: l.informationSought,
        style: 'sectionHeader',
        margin: [0, 10, 0, 5],
      },
      { text: data.informationSought, margin: [0, 0, 0, 15] },
      {
        text: l.reason,
        style: 'sectionHeader',
        margin: [0, 5, 0, 5],
      },
      { text: data.reason || '—', margin: [0, 0, 0, 20] },
      {
        text: l.applicantDetails,
        style: 'sectionHeader',
        margin: [0, 10, 0, 10],
      },
      {
        table: {
          widths: ['30%', '70%'],
          body: [
            [{ text: l.name, bold: true }, data.fullName],
            [{ text: l.address, bold: true }, { text: data.address, margin: [0, 5, 0, 5] }],
          ],
        },
        margin: [0, 0, 0, 20],
      },
      { text: l.declaration, margin: [0, 0, 0, 25], fontSize: 10, italics: true },
      {
        columns: [
          { text: `${l.signature}: _________________`, width: 'auto' },
          { text: `${l.datePlace}: ${currentDate}`, width: 'auto', alignment: 'right' },
        ],
        margin: [0, 30, 0, 10],
      },
      { text: data.fullName, margin: [0, 5, 0, 0] },
    ],
    styles: {
      header: { fontSize: 16, bold: true, color: '#1a1a1a' },
      sectionHeader: { fontSize: 12, bold: true, color: '#3b82f6' },
    },
    defaultStyle: { font: 'Roboto', fontSize: 11 },
  };

  const pdfDoc = pdfMake.createPdf(docDefinition);
  pdfDoc.download(`RTI_Application_${currentDate.replace(/\//g, '-')}.pdf`);
};
