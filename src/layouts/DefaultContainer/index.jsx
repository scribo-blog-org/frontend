'use client';

import "./DefaultContainer.scss"

const DefaultContainer = ({ children }) => {
    return (
        <div className="default-container">
            {children}
        </div>
    );
}

export default DefaultContainer;
