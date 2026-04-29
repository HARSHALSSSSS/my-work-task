import api from './client';

type Res<T> = { success: boolean; data: T; message?: string };

export interface DesignTemplate {
  _id: string;
  name: string;
  category: string;
  flowType: 'gifting' | 'business_printing' | 'shopping';
  isPremium: boolean;
  productId?: string;
  previewImage?: string;
  dimensions?: { width: number; height: number; unit: string };
  tags?: string[];
}

export interface Design {
  _id: string;
  userId: string;
  productId: string;
  name: string;
  canvasJson: any;
  previewImage?: string;
  flowType: 'gifting' | 'business_printing' | 'shopping';
  designType: 'premium' | 'normal';
  templateId?: string;
  dimensions?: { width: number; height: number; unit: string };
  isFinalized: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getTemplates(params?: { flowType?: string; category?: string; isPremium?: boolean; productId?: string }) {
  const { data } = await api.get<Res<DesignTemplate[]>>('/api/designs/templates', { params });
  return data.data;
}

export async function getPremiumTemplates(params?: { productId?: string; category?: string }) {
  const { data } = await api.get<Res<DesignTemplate[]>>('/api/designs/templates/premium', { params });
  return data.data;
}

export async function createBlankDesign(body: { productId: string; flowType: string; dimensions?: { width: number; height: number } }): Promise<Design> {
  const { data } = await api.post<Res<Design>>('/api/designs/blank', body);
  return data.data;
}

export async function createFromTemplate(body: { productId: string; templateId: string; flowType: string }): Promise<Design> {
  const { data } = await api.post<Res<Design>>('/api/designs/from-template', body);
  return data.data;
}

export async function saveDesign(body: {
  productId: string;
  name?: string;
  canvasJson: any;
  previewImage?: string;
  flowType: string;
  dimensions?: { width: number; height: number };
}): Promise<Design> {
  const { data } = await api.post<Res<Design>>('/api/designs', body);
  return data.data;
}

export async function getMyDesigns(productId?: string) {
  const { data } = await api.get<Res<Design[]>>('/api/designs', { params: productId ? { productId } : {} });
  return data.data;
}

export async function getDesign(id: string): Promise<Design> {
  const { data } = await api.get<Res<Design>>(`/api/designs/${id}`);
  return data.data;
}

export async function updateDesign(id: string, body: Partial<Pick<Design, 'name' | 'canvasJson' | 'previewImage' | 'isFinalized'>>): Promise<Design> {
  const { data } = await api.put<Res<Design>>(`/api/designs/${id}`, body);
  return data.data;
}
