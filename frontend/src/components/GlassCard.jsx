import React from 'react';

function GlassCard({ children, className = '' }) {
    return (
        <div className={`glass relative ${className}`}>
            {children}
        </div>
    );
}

export default GlassCard;
