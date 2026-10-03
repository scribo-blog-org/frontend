'use client';

import ClockIcon from '../../assets/svg/clock.svg';
import TickIcon from '../../assets/svg/tick.svg';
import TickDoubleIcon from '../../assets/svg/tick-double.svg';

import './MessageStatus.scss';

const MessageStatus = ({ status }: any) => {
    if (!status) {
        return null;
    }

    if (status === 'sending') {
        return (
            <span
                className="message_status message_status_sending"
                aria-label="Sending"
            >
                <ClockIcon />
            </span>
        );
    }

    if (status === 'sent') {
        return (
            <span
                className="message_status message_status_sent"
                aria-label="Sent"
            >
                <TickIcon />
            </span>
        );
    }

    return (
        <span className="message_status message_status_read" aria-label="Read">
            <TickDoubleIcon />
        </span>
    );
};

export default MessageStatus;
