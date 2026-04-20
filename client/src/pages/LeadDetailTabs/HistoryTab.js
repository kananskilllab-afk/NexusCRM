import React from 'react';
import { FiActivity } from 'react-icons/fi';

const HistoryTab = ({ lead }) => {
  const activities = lead.activities || [];

  return (
    <div className="tab-content history-tab">
      <div className="card">
        <div className="section-header"><h3>Complete Audit Trail ({activities.length} entries)</h3></div>
        <div className="timeline">
          {activities.length > 0 ? activities.map((activity, index) => (
            <div key={activity.id || index} className="timeline-item">
              <div className="timeline-icon"><FiActivity /></div>
              <div className="timeline-content">
                <div className="timeline-header">
                  <span className="timeline-user">{activity.user || 'System'}</span>
                  <span className="timeline-date">{new Date(activity.date).toLocaleString()}</span>
                </div>
                <p className="timeline-text">{activity.text}</p>
              </div>
            </div>
          )) : (
            <div className="empty-state"><p>No activities tracked yet.</p></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryTab;
