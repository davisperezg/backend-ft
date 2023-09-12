import { TDocumentDefinitions } from 'pdfmake/interfaces';

export const docDefinitionA4: TDocumentDefinitions = {
  pageSize: {
    width: 80 * 2.83465,
    height: 'auto',
  },
  //pageMargins: [30, 30],
  content: [
    {
      text: 'keinr',
    },
  ],
};
