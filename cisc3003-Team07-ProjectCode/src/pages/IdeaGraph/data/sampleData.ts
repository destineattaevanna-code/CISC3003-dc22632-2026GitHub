import { Node, Edge } from 'reactflow';

// 重新设计布局，实现以Idea为核心的环绕效果
export const initialNodes: Node[] = [
  // 集群1: Idea 1 为中心
  {
    id: '1',
    type: 'idea',
    position: { x: 400, y: 300 }, // 中心位置
    data: {
      label: 'AI-Assisted Medical Imaging Diagnosis',
      description: 'Use deep learning to analyze medical images and improve diagnostic accuracy.',
      feasibility: 'High',
      novelty: 'Medium',
      createdAt: '2024-01-15',
    },
  },
  // Paper 2 环绕在 Idea 1 周围
  {
    id: '2',
    type: 'paper',
    position: { x: 250, y: 150 }, // 左上
    data: {
      title: 'A Deep Learning Approach for Medical Image Segmentation',
      authors: ['Li, Chen', 'Wang, Wei', 'Zhang, Ming'],
      year: 2023,
      abstract:
        'This paper proposes a lightweight segmentation network for clinical imaging, improving boundary accuracy while keeping inference latency low.',
      citations: 128,
    },
  },
  {
    id: '4',
    type: 'paper',
    position: { x: 550, y: 150 }, // 右上
    data: {
      title: 'Interpretable Machine Learning for Medical Diagnosis',
      authors: ['Smith, John', 'Johnson, Emma'],
      year: 2022,
      abstract:
        'We introduce a clinically grounded interpretation framework that links model predictions to human-readable diagnostic evidence.',
      citations: 96,
    },
  },
  {
    id: '6',
    type: 'paper',
    position: { x: 250, y: 450 }, // 左下
    data: {
      title: 'Multimodal Fusion for Medical Diagnosis',
      authors: ['Chen, Xia', 'Liu, Yang', 'Zhang, Hua'],
      year: 2023,
      abstract:
        'A fusion model combining imaging and clinical text improves diagnostic recall across multiple specialties.',
      citations: 74,
    },
  },

  // 集群2: Idea 3 为中心
  {
    id: '3',
    type: 'idea',
    position: { x: 800, y: 300 }, // 第二个中心
    data: {
      label: 'Explainable AI for Clinical Decision Support',
      description: 'Build AI models that expose decision logic to improve clinician and patient trust.',
      feasibility: 'Medium',
      novelty: 'High',
      createdAt: '2024-01-20',
    },
  },
  // Paper 8 环绕在 Idea 3 周围
  {
    id: '8',
    type: 'paper',
    position: { x: 650, y: 150 }, // 左上
    data: {
      title: 'Privacy-Preserving Medical AI with Federated Learning',
      authors: ['Yang, Li', 'Wang, Fang'],
      year: 2024,
      abstract:
        'We evaluate federated learning protocols that minimize data leakage while maintaining diagnostic performance.',
      citations: 32,
    },
  },
  {
    id: '12',
    type: 'paper',
    position: { x: 950, y: 150 }, // 右上
    data: {
      title: 'Federated Learning in Healthcare: A Review',
      authors: ['Liu, Xia', 'Zhang, Wei'],
      year: 2023,
      abstract:
        'A survey of federated learning deployments in healthcare, highlighting open challenges in privacy and drift.',
      citations: 210,
    },
  },

  // 集群3: Idea 5 为中心
  {
    id: '5',
    type: 'idea',
    position: { x: 400, y: 600 }, // 第三个中心
    data: {
      label: 'Multimodal Diagnostic Fusion',
      description: 'Combine imaging, clinical text, and physiological signals for robust diagnosis.',
      feasibility: 'Medium',
      novelty: 'High',
      createdAt: '2024-01-25',
    },
  },
  // Paper 9 环绕在 Idea 5 周围
  {
    id: '9',
    type: 'paper',
    position: { x: 250, y: 750 }, // 左下
    data: {
      title: 'Advanced Medical AI with Edge Computing',
      authors: ['Zhang, Qiang', 'Liu, Min'],
      year: 2023,
      abstract:
        'Edge deployment strategies enable real-time inference while protecting patient data within hospital networks.',
      citations: 58,
    },
  },

  // 集群4: Idea 7 为中心
  {
    id: '7',
    type: 'idea',
    position: { x: 800, y: 600 }, // 第四个中心
    data: {
      label: 'Federated Learning for Medical Privacy',
      description: 'Train collaborative models without sharing raw patient data.',
      feasibility: 'High',
      novelty: 'High',
      createdAt: '2024-01-30',
    },
  },

  // 集群5: Idea 10 为中心
  {
    id: '10',
    type: 'idea',
    position: { x: 1100, y: 300 }, // 第五个中心
    data: {
      label: 'Edge AI for Real-time Healthcare',
      description: 'Run medical AI inference on edge devices to reduce latency.',
      feasibility: 'Medium',
      novelty: 'Medium',
      createdAt: '2024-02-10',
    },
  },
  // Paper 11 环绕在 Idea 10 周围
  {
    id: '11',
    type: 'paper',
    position: { x: 950, y: 450 }, // 右下
    data: {
      title: 'Edge Computing for Real-time Medical Diagnosis',
      authors: ['Wang, Lei', 'Chen, Hao'],
      year: 2023,
      abstract:
        'We benchmark edge inference pipelines and quantify latency savings for critical care workflows.',
      citations: 44,
    },
  },

  // 集群6: Paper 13 为中心
  {
    id: '13',
    type: 'paper',
    position: { x: 1400, y: 650 },
    data: {
      title: 'Foundation Models for Clinical Reasoning',
      authors: ['Brown, Ada', 'Nguyen, Lien', 'Patel, Arjun'],
      year: 2024,
      abstract:
        'A large language model fine-tuned for clinical reasoning, showing improved decision support accuracy.',
      citations: 51,
    },
  },
  {
    id: '14',
    type: 'idea',
    position: { x: 1550, y: 540 },
    data: {
      label: 'Context-aware Clinical Summaries',
      description: 'Generate visit summaries grounded in patient-specific context and clinician notes.',
      feasibility: 'Medium',
      novelty: 'High',
      createdAt: '2024-02-15',
    },
  },
  {
    id: '15',
    type: 'idea',
    position: { x: 1270, y: 540 },
    data: {
      label: 'Guideline Alignment for LLM Advice',
      description: 'Constrain model outputs to follow official clinical guidelines and protocols.',
      feasibility: 'High',
      novelty: 'Medium',
      createdAt: '2024-02-18',
    },
  },
  {
    id: '16',
    type: 'idea',
    position: { x: 1400, y: 780 },
    data: {
      label: 'Evidence-linked Decision Support',
      description: 'Attach citations from papers and trials to each recommended clinical action.',
      feasibility: 'Medium',
      novelty: 'High',
      createdAt: '2024-02-20',
    },
  },
];

// 创建曲线连接，使用bezier实现平滑曲线
export const initialEdges: Edge[] = [
  // 集群1: Idea 1 的连接
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    type: 'bezier',
    style: { stroke: '#667eea', strokeWidth: 2 },
  },
  {
    id: 'e1-4',
    source: '1',
    target: '4',
    type: 'bezier',
    style: { stroke: '#667eea', strokeWidth: 2 },
  },
  {
    id: 'e1-6',
    source: '1',
    target: '6',
    type: 'bezier',
    style: { stroke: '#667eea', strokeWidth: 2 },
  },

  // 集群2: Idea 3 的连接
  {
    id: 'e3-4',
    source: '3',
    target: '4',
    type: 'bezier',
    style: { stroke: '#667eea', strokeWidth: 2 },
  },
  {
    id: 'e3-8',
    source: '3',
    target: '8',
    type: 'bezier',
    style: { stroke: '#667eea', strokeWidth: 2 },
  },
  {
    id: 'e3-12',
    source: '3',
    target: '12',
    type: 'bezier',
    style: { stroke: '#667eea', strokeWidth: 2 },
  },

  // 集群3: Idea 5 的连接
  {
    id: 'e5-6',
    source: '5',
    target: '6',
    type: 'bezier',
    style: { stroke: '#667eea', strokeWidth: 2 },
  },
  {
    id: 'e5-9',
    source: '5',
    target: '9',
    type: 'bezier',
    style: { stroke: '#667eea', strokeWidth: 2 },
  },

  // 集群4: Idea 7 的连接
  {
    id: 'e7-8',
    source: '7',
    target: '8',
    type: 'bezier',
    style: { stroke: '#667eea', strokeWidth: 2 },
  },
  {
    id: 'e7-12',
    source: '7',
    target: '12',
    type: 'bezier',
    style: { stroke: '#667eea', strokeWidth: 2 },
  },

  // 集群5: Idea 10 的连接
  {
    id: 'e10-11',
    source: '10',
    target: '11',
    type: 'bezier',
    style: { stroke: '#667eea', strokeWidth: 2 },
  },

  // 集群6: Paper 13 为中心
  {
    id: 'e14-13',
    source: '14',
    target: '13',
    type: 'bezier',
    style: { stroke: '#667eea', strokeWidth: 2 },
  },
  {
    id: 'e15-13',
    source: '15',
    target: '13',
    type: 'bezier',
    style: { stroke: '#667eea', strokeWidth: 2 },
  },
  {
    id: 'e16-13',
    source: '16',
    target: '13',
    type: 'bezier',
    style: { stroke: '#667eea', strokeWidth: 2 },
  },

  // 跨集群连接
  {
    id: 'e10-9',
    source: '10',
    target: '9',
    type: 'smoothstep',
    style: { stroke: '#667eea', strokeWidth: 2 },
  },
];