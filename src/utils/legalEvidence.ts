import { LegalTopicId, getTopicFromQuery } from './legalTopics';

export interface LegalEvidenceSnippet {
  id: string;
  topic: LegalTopicId | 'general';
  act: string;
  section: string;
  clause: string;
}

const EVIDENCE_SNIPPETS: LegalEvidenceSnippet[] = [
  {
    id: 'ipc-441-criminal-trespass',
    topic: 'land dispute',
    act: 'Indian Penal Code, 1860',
    section: 'Section 441 – Criminal Trespass',
    clause: 'Whoever enters into or upon property in the possession of another with intent to commit an offence or to intimidate, insult or annoy any person in possession of such property, is said to commit criminal trespass.',
  },
  {
    id: 'ipc-447-trespass-punishment',
    topic: 'land dispute',
    act: 'Indian Penal Code, 1860',
    section: 'Section 447 – Punishment for Criminal Trespass',
    clause: 'Whoever commits criminal trespass shall be punished with imprisonment of either description for a term which may extend to three months, or with fine which may extend to five hundred rupees, or with both.',
  },
  {
    id: 'ipc-498a-cruelty',
    topic: 'domestic violence',
    act: 'Indian Penal Code, 1860',
    section: 'Section 498A – Cruelty by Husband or Relatives',
    clause: 'Husband or relative of husband of a woman subjecting her to cruelty shall be punished with imprisonment which may extend to three years and shall also be liable to fine.',
  },
  {
    id: 'dv-act-3-definition',
    topic: 'domestic violence',
    act: 'Protection of Women from Domestic Violence Act, 2005',
    section: 'Section 3 – Definition of Domestic Violence',
    clause: 'Any act, omission or commission or conduct of the respondent shall constitute domestic violence if it harms, injures or endangers the health, safety, life, limb or well-being, whether mental or physical, of the aggrieved person.',
  },
  {
    id: 'dowry-act-3-penalty',
    topic: 'dowry',
    act: 'Dowry Prohibition Act, 1961',
    section: 'Section 3 – Penalty for Giving or Taking Dowry',
    clause: 'If any person gives or takes or abets the giving or taking of dowry, he shall be punishable with imprisonment for a term not less than five years and with fine.',
  },
  {
    id: 'ipc-304b-dowry-death',
    topic: 'dowry harassment',
    act: 'Indian Penal Code, 1860',
    section: 'Section 304B – Dowry Death',
    clause: 'Where the death of a woman is caused by any burns or bodily injury or occurs otherwise than under normal circumstances within seven years of her marriage and it is shown that soon before her death she was subjected to cruelty or harassment for, or in connection with, any demand for dowry, such death shall be called “dowry death”.',
  },
  {
    id: 'ipc-154-fir',
    topic: 'fir',
    act: 'Code of Criminal Procedure, 1973',
    section: 'Section 154 – First Information in Cognizable Cases',
    clause: 'Every information relating to the commission of a cognizable offence, if given orally to an officer in charge of a police station, shall be reduced to writing and read over to the informant and a copy shall be given forthwith, free of cost.',
  },
  {
    id: 'ipc-379-theft',
    topic: 'theft',
    act: 'Indian Penal Code, 1860',
    section: 'Section 379 – Punishment for Theft',
    clause: 'Whoever commits theft shall be punished with imprisonment of either description for a term which may extend to three years, or with fine, or with both.',
  },
  {
    id: 'wages-act-4-deductions',
    topic: 'wages',
    act: 'Payment of Wages Act, 1936',
    section: 'Section 7 – Deductions which may be made from wages',
    clause: 'Notwithstanding the provisions of any law, the wages of an employed person shall be paid to him without deduction of any kind except those authorised by or under this Act.',
  },
  {
    id: 'min-wages-act-12-payment',
    topic: 'wages',
    act: 'Minimum Wages Act, 1948',
    section: 'Section 12 – Payment of Minimum Rates of Wages',
    clause: 'Where in respect of any scheduled employment a notification under section 5 is in force, the employer shall pay to every employee engaged in a scheduled employment wages at a rate not less than the minimum rate of wages fixed for that class of employees.',
  },
  {
    id: 'rti-act-6-request',
    topic: 'fir',
    act: 'Right to Information Act, 2005',
    section: 'Section 6 – Request for Obtaining Information',
    clause: 'A person, who desires to obtain any information under this Act, shall make a request in writing or through electronic means in English or Hindi or in the official language of the area.',
  },
  {
    id: 'rti-act-7-disposal',
    topic: 'fir',
    act: 'Right to Information Act, 2005',
    section: 'Section 7 – Disposal of Request',
    clause: 'The Central Public Information Officer or State Public Information Officer shall, as expeditiously as possible, and in any case within thirty days of the receipt of the request, either provide the information or reject the request.',
  },
  {
    id: 'general-legal-aid',
    topic: 'general',
    act: 'Legal Services Authorities Act, 1987',
    section: 'Section 12 – Criteria for Giving Legal Services',
    clause: 'Every person who has to file or defend a case shall be entitled to legal services if that person is a member of a Scheduled Caste or Scheduled Tribe or is a victim of trafficking or is a woman or a child, among others.',
  },
  {
    id: 'general-helpline',
    topic: 'general',
    act: 'General Safety',
    section: 'Helplines – Emergency Support',
    clause: 'Women Helpline 181 and Police Helpline 112 can be contacted in emergency situations for immediate assistance and to initiate appropriate legal action.',
  },
];

export function getEvidenceForQuery(query: string, maxSnippets: number = 3): LegalEvidenceSnippet[] {
  const topicId = getTopicFromQuery(query);

  if (topicId) {
    const topicSpecific = EVIDENCE_SNIPPETS.filter((e) => e.topic === topicId);
    if (topicSpecific.length > 0) {
      return topicSpecific.slice(0, maxSnippets);
    }
  }

  const general = EVIDENCE_SNIPPETS.filter((e) => e.topic === 'general');
  const remaining = EVIDENCE_SNIPPETS.filter((e) => e.topic !== 'general');

  const combined: LegalEvidenceSnippet[] = [...general, ...remaining];
  return combined.slice(0, maxSnippets);
}

