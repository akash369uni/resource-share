import * as React from 'react';

interface EmailTemplateProps {
  teacherName: string;
  resourceName: string;
  status: string;
  date: string;
  message: string;
}

export function EmailTemplate({ teacherName, resourceName, status, date, message }: EmailTemplateProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: '600px', margin: '0 auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
      <h2 style={{ color: '#0f172a' }}>ResourceShare Update</h2>
      <p>Hello <strong>{teacherName}</strong>,</p>
      <p>{message}</p>
      
      <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', margin: '20px 0' }}>
        <p style={{ margin: '5px 0' }}><strong>Resource:</strong> {resourceName}</p>
        <p style={{ margin: '5px 0' }}><strong>Date:</strong> {date}</p>
        <p style={{ margin: '5px 0' }}><strong>Status:</strong> <span style={{ fontWeight: 'bold', color: status === 'approved' ? '#16a34a' : '#d97706' }}>{status.toUpperCase()}</span></p>
      </div>
      
      <p style={{ fontSize: '12px', color: '#64748b' }}>This is an automated message from the ResourceShare Platform.</p>
    </div>
  );
}