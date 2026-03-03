import React from 'react';

function PageShell({ children, center = false, className = '' }) {
    return (
        <div
            className={`min-h-screen w-full bg-transparent relative overflow-hidden ${
                center ? 'flex items-center justify-center p-4' : 'p-4'
            } ${className}`}
        >
            {children}
        </div>
    );
}

export default PageShell;
