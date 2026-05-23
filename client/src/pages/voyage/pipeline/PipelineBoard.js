import React, { useState, useEffect } from 'react';
import { FiPlus, FiMoreHorizontal, FiCalendar } from 'react-icons/fi';
import { voyageApi } from '../../../services/voyageApi';

const PipelineBoard = () => {
  const [data, setData] = useState({ stages: {}, tasks: {}, stageOrder: [] });
  const [loading, setLoading] = useState(true);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [draggedSourceStageId, setDraggedSourceStageId] = useState(null);
  const [dragOverStageId, setDragOverStageId] = useState(null);

  useEffect(() => {
    fetchPipeline();
  }, []);

  const fetchPipeline = async () => {
    try {
      const res = await voyageApi.getPipeline();
      const newStages = {};
      const newTasks = {};
      const stageOrder = res.stages.map(s => s.id);

      res.stages.forEach(s => {
        newStages[s.id] = { id: s.id, title: s.name, taskIds: [] };
      });

      res.bookings.forEach(b => {
        const taskId = b.id.toString();
        newTasks[taskId] = { 
          id: taskId, 
          content: `${b.destination} - ${b.last_name || 'Client'}`, 
          amount: `₹${(b.total_sell_cents / 100).toLocaleString()}` 
        };
        // Put in correct stage, default to first stage if missing
        const targetStageId = b.stage_id || stageOrder[0];
        if (newStages[targetStageId]) {
          newStages[targetStageId].taskIds.push(taskId);
        }
      });

      setData({ stages: newStages, tasks: newTasks, stageOrder });
      setLoading(false);
    } catch (err) {
      console.error('Failed to load pipeline:', err);
      setLoading(false);
    }
  };

  const handleDragStart = (e, taskId, sourceStageId) => {
    setDraggedTaskId(taskId);
    setDraggedSourceStageId(sourceStageId);
    e.dataTransfer.setData('text/plain', JSON.stringify({ taskId, sourceStageId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, stageId) => {
    e.preventDefault();
    setDragOverStageId(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStageId(null);
  };

  const handleDrop = async (e, targetStageId) => {
    e.preventDefault();
    setDragOverStageId(null);
    
    const rawData = e.dataTransfer.getData('text/plain');
    let taskId = draggedTaskId;
    let sourceStageId = draggedSourceStageId;
    
    if (rawData) {
      try {
        const parsed = JSON.parse(rawData);
        taskId = parsed.taskId;
        sourceStageId = parsed.sourceStageId;
      } catch (err) {}
    }

    if (!taskId || !sourceStageId || sourceStageId === targetStageId) return;

    // Move task in state optimistically
    const sourceStage = data.stages[sourceStageId];
    const targetStage = data.stages[targetStageId];
    
    const newSourceTaskIds = sourceStage.taskIds.filter(id => id !== taskId);
    const newTargetTaskIds = [...targetStage.taskIds, taskId];

    setData({
      ...data,
      stages: {
        ...data.stages,
        [sourceStageId]: { ...sourceStage, taskIds: newSourceTaskIds },
        [targetStageId]: { ...targetStage, taskIds: newTargetTaskIds }
      }
    });

    setDraggedTaskId(null);
    setDraggedSourceStageId(null);

    // Sync with DB
    try {
      await voyageApi.updateBookingStage(taskId, targetStageId);
    } catch (err) {
      console.error('Failed to update stage in DB:', err);
      fetchPipeline(); // Revert on failure
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading pipeline...</div>;

  return (
    <div style={{ padding: '20px', height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Sales Pipeline</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0 0' }}>Drag and drop bookings to update stages.</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => 
            voyageApi.createBooking({ 
              destination: 'New Custom Trip', 
              reference: 'BKG-00' + Math.floor(Math.random() * 100), 
              start_at: '2025-10-10', 
              total_sell_cents: 500000 
            })
            .then(() => fetchPipeline())
            .catch(err => {
              console.error('Failed to create enquiry:', err);
              alert('Failed to create enquiry: ' + err.message);
            })
          }
        >
          <FiPlus /> New Enquiry
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', flex: 1, paddingBottom: '20px' }}>
        {data.stageOrder.map(stageId => {
          const stage = data.stages[stageId];
          const tasks = stage.taskIds.map(taskId => data.tasks[taskId]);

          return (
            <div 
              key={stage.id} 
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
              style={{ 
                background: dragOverStageId === stage.id ? '#e2e8f0' : '#f4f5f7', 
                borderRadius: '8px', 
                width: '300px', 
                flexShrink: 0, 
                display: 'flex', 
                flexDirection: 'column', 
                maxHeight: '100%',
                transition: 'background-color 0.2s ease',
                border: dragOverStageId === stage.id ? '2px dashed var(--primary)' : '2px solid transparent'
              }}
            >
              <div style={{ padding: '15px', fontWeight: 'bold', borderBottom: '2px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{stage.title} <span style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', marginLeft: '5px' }}>{tasks.length}</span></span>
                <FiMoreHorizontal style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} />
              </div>
              
              <div style={{ padding: '15px', flex: 1, overflowY: 'auto' }}>
                {tasks.map(task => (
                  <div
                    key={task.id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, task.id, stage.id)}
                    style={{ 
                      userSelect: 'none', 
                      padding: '15px', 
                      margin: '0 0 10px 0', 
                      minHeight: '50px', 
                      backgroundColor: '#fff', 
                      borderRadius: '8px', 
                      boxShadow: draggedTaskId === task.id ? '0 5px 15px rgba(90, 82, 255, 0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
                      cursor: 'grab',
                      opacity: draggedTaskId === task.id ? 0.6 : 1,
                      border: draggedTaskId === task.id ? '1px solid var(--primary)' : '1px solid transparent',
                      transition: 'transform 0.15s ease, opacity 0.15s ease'
                    }}
                  >
                    <div style={{ fontWeight: 500, marginBottom: '10px' }}>{task.content}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span>{task.amount}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiCalendar /> Today</span>
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                    No bookings in this stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineBoard;
