import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

interface HubNodeProps {
  data: {
    ideaId: number;
    groupId?: number;
  };
  selected?: boolean;
}

/**
 * Hub node - a small connector node between idea and its papers.
 * Represents the "string" that connects all paper "balloons" to the idea.
 * All handles are centered for radial connections.
 */
const HubNode: React.FC<HubNodeProps> = memo(({ data, selected }) => {
  // Centered handle style - all handles at the center of the node
  const centerHandleStyle: React.CSSProperties = {
    opacity: 0,
    width: 1,
    height: 1,
    minWidth: 1,
    minHeight: 1,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    position: 'absolute',
  };

  return (
    <div className={`hub-node ${selected ? 'selected' : ''}`}>
      {/* Multiple handles all centered for radial edge connections */}
      <Handle 
        type="target" 
        position={Position.Top} 
        id="target-top"
        style={centerHandleStyle} 
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="target-left"
        style={centerHandleStyle} 
      />
      <Handle 
        type="target" 
        position={Position.Right} 
        id="target-right"
        style={centerHandleStyle} 
      />
      <Handle 
        type="target" 
        position={Position.Bottom} 
        id="target-bottom"
        style={centerHandleStyle} 
      />
      <Handle 
        type="source" 
        position={Position.Top} 
        id="source-top"
        style={centerHandleStyle} 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="source-bottom"
        style={centerHandleStyle} 
      />
      <Handle 
        type="source" 
        position={Position.Left} 
        id="source-left"
        style={centerHandleStyle} 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="source-right"
        style={centerHandleStyle} 
      />
    </div>
  );
});

HubNode.displayName = 'HubNode';

export default HubNode;
