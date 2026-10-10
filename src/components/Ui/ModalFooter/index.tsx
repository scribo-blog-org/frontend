'use client';

import './ModalFooter.scss';

// The bar at the bottom of a dialog: a short hint on the left, the actions on
// the right. It stays at the bottom edge while the content scrolls.
const ModalFooter = ({ hint, children }: any) => (
    <div className="modal_footer">
        {hint ? <span className="modal_footer_hint">{hint}</span> : null}
        <div className="modal_footer_actions">{children}</div>
    </div>
);

export default ModalFooter;
