# IdeaGraph 共享 Paper 连线逻辑说明

> 此文档记录了 nexusrepaper 中 IdeaGraph 曾经使用的"共享 Paper"连线模式。
> 该模式已被移除，恢复为与 amuse 一致的"每个 Idea 独立 Paper"模式。
> 如果后续需要重新启用，可参考此文档。

---

## 核心理念

**Paper 节点跨 Idea 共享**：如果多个 Idea 关联了同一篇 Paper，图上只创建一个 Paper 节点，该节点同时连接到所有相关的 Idea 节点，作为 Idea 之间的视觉"桥梁"。

对比原始模式（amuse）：每个 Idea 有自己独立的 Paper 副本（`paper-{ideaId}-{paperId}`），同一篇论文可能在图上出现多次。

---

## 关键实现细节

### 1. `buildGraphFromUserIdeas` 函数

- **Paper 节点 ID 格式**：`paper-{paperId}`（不含 ideaId），确保全局唯一。
- **使用 `paperNodesMap`**：`Map<string, { node: Node; sourceForIdeaIds: Set<number> }>`
  - 第一次遇到某 paperId 时创建节点。
  - 后续再遇到同一 paperId 时，合并 metadata（authors、abstract 等），并将新的 ideaId 加入 `connectedIdeaIds` 数组。
- **Paper 节点 data 字段**：
  - `connectedIdeaIds: number[]` — 连接到此 paper 的所有 idea ID
  - `sourceForIdeaIds: number[]` — 此 paper 作为源论文的 idea ID
  - `isShared: boolean` — `connectedIdeaIds.length > 1`
- **Edge 创建**：每个 idea-paper 关系对应一条边 `e-idea-{ideaId}-paper-{paperId}`。
- **去重**：每个 idea 内部用 `seenPaperIdsForIdea` Set 防止同一 idea 对同一 paper 产生重复边。
- **Edge 样式**：
  - 共享 paper：`stroke: '#6366f1'`, `strokeWidth: 1.8`, `opacity: 1`
  - 独占 paper：`stroke: '#7c3aed'`, `strokeWidth: 2`, `opacity: 1`
- **Edge 索引分配**：
  - 构建完边后，按 source 节点分组，给每条边分配 `edgeIndex` 和 `edgeTotalFromSource`。
  - 用于 FloatingEdge 中计算扇形散开偏移。

### 2. `FloatingEdge` 组件

使用**三次贝塞尔曲线（Cubic Bezier）**，在源节点附近扇形散开，到达目标节点时趋于直线：

```typescript
// C1: near source (25% along), offset perpendicular → creates the fan
const c1x = sx + dx * 0.25 + nx * fanOffset;
const c1y = sy + dy * 0.25 + ny * fanOffset;
// C2: near target (75% along), no offset → arrives straight
const c2x = sx + dx * 0.75;
const c2y = sy + dy * 0.75;

const edgePath = `M ${sx} ${sy} C ${c1x} ${c1y} ${c2x} ${c2y} ${tx} ${ty}`;
```

- `fanOffset` 基于 `edgeIndex` 和 `edgeTotalFromSource` 计算，使从同一 idea 出发的多条边均匀扇形展开。
- `step = max(min(len * 0.08, 60) / max(edgeTotal - 1, 1), 18)`
- **Viewport culling**：margin 设为 `Math.max(viewWidth, viewHeight)`（整个视口尺寸），避免拖动时线条闪烁。
- **去掉了 `hasSize` 检查**：因为拖动时节点尺寸可能瞬间为 0/undefined 导致边消失。

### 3. `createForceLayout` 布局算法

分三个阶段：

**Phase 1: 放置 Idea 节点**
- 以画布中心为起点，使用径向搜索 + 碰撞检测放置 idea 节点。
- 种子 idea（当前选中的）放在中心。
- 其他 idea 从 R0=3200 开始，每圈 R_STEP=800，16 个角度步进。

**Phase 2: 放置独占 Paper（连接 1 个 idea 的 paper）**
- 环绕所属 idea 节点排列。
- 关键优化：如果该 idea 有共享 paper 邻居，则将独占 paper 放在**远离**共享邻居方向的弧形区域，为共享 paper 的连线留出清晰通道。
- 弧形范围：`min(π * 1.5, max(π, count * 0.45))`

**Phase 3: 放置共享 Paper（连接 2+ 个 idea 的 paper）**
- 按连接签名分组（如 `1-3` 表示连接 idea 1 和 idea 3 的所有 paper）。
- 放置在所连接 idea 的质心位置。
- 多个同签名 paper 在质心周围展开成小环。

**Phase 4: 反重叠斥力迭代**
- 8 次迭代，对 paper-paper 和 paper-idea 之间距离过近的节点施加斥力推开。
- paper-paper 最小距离：280px
- paper-idea 最小距离：350px

### 4. `applyRelevanceFilterToGraph` 过滤逻辑

- 共享 paper 模式下，一个 paper 可能有多条 incoming edge（来自不同 idea）。
- 只要**任一**连接 edge 的 relevanceScore 满足阈值，就保留该 paper。

### 5. `onNodeClick` 事件

- 点击 paper 节点时，遍历 `connectedIdeaIds`，对所有非源论文的 idea 调用 `markRelatedPaperViewed`。

### 6. `markRelatedPaperViewed` 函数

- 匹配条件只检查 `paperId`（不检查 `ownerIdeaId`），因为共享模式下一个 paper 节点对应多个 idea。

---

## 布局常量参考

| 常量 | 值 | 说明 |
|------|------|------|
| CARD_RADIUS | 300 | 节点半径近似值 |
| CLUSTER_GAP | 1500 | 簇间额外间距 |
| PAPER_CARD_MIN_SEP | 900 | Paper 间最小间距 |
| PAPER_DISTANCE_BASE | 950 | Idea → Paper 基础距离 |
| PAPER_DISTANCE_STEP | 120 | 每多一个 paper 的额外距离 |
| R0 | 3200 | Idea 径向搜索起始半径 |
| R_STEP | 800 | 每圈增加的半径 |
| ANGLE_STEPS | 16 | 每圈尝试的角度数 |
| MIN_PAPER_SEP (repulsion) | 280 | 斥力阶段最小 paper 间距 |
| MIN_IDEA_PAPER_SEP (repulsion) | 350 | 斥力阶段最小 idea-paper 间距 |

---

## 文件位置

所有改动集中在 `src/pages/IdeaGraph/index.tsx` 中的以下函数：
- `buildGraphFromUserIdeas`
- `FloatingEdge`
- `createForceLayout`
- `applyRelevanceFilterToGraph`
- `markRelatedPaperViewed`
- `onNodeClick`
