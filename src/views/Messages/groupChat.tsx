'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
    addGroupMember,
    createGroup,
    removeGroupMember,
    updateGroup,
    updateGroupMemberRole,
} from '../../api/chat.api';
import { searchUsers } from '../../api/search.api';
import UserBadge from '../../components/UserBadge';
import UserRow from '../../components/UserRow';
import ActionButton from '../../components/Ui/ActionButton';
import CancelButton from '../../components/Ui/CancelButton';
import DangerButton from '../../components/Ui/DangerButton';
import {
    MetaGrid,
    ModalFooter,
    Panel,
    PanelRow,
    Pill,
} from '../../components/Ui';
import DropFile from '../../components/Ui/DropFile';
import InputField from '../../components/Ui/InputField';
import SharePostModal from '../../components/SharePostModal';
import Popup from '../../components/Ui/Popup';
import PrimaryButton from '../../components/Ui/PrimaryButton';
import SearchSelect from '../../components/Ui/SearchSelect';
import ShareIcon from '../../assets/svg/share.svg';
import { FIELD_LIMITS } from '../../constants/fieldLimits';
import DefaultProfileAvatar from '../../assets/images/default-profile-avatar.png';
import InfoIcon from '../../assets/svg/info.svg';
import LogoutIcon from '../../assets/svg/logout.svg';
import PeoplesIcon from '../../assets/svg/peoples.svg';
import ThreeDotsIcon from '../../assets/svg/three-dots.svg';
import { imageSrc } from '../../utils/image';

const roleLabel = (role: any) =>
    role === 'admin' ? 'Administrator' : 'Participant';

export const isGroupChat = (item: any) => item?.kind === 'group';

export function groupListPatch(detail: any, previous: any = {}) {
    return {
        ...previous,
        _id: detail._id,
        kind: 'group',
        title: detail.title,
        description: detail.description || '',
        photo: detail.photo || null,
        member_count: Array.isArray(detail.members)
            ? detail.members.length
            : previous.member_count,
        my_role: detail.my_role,
        participant: null,
    };
}

export const TypingDots = () => (
    <span className="user_activity_status_dots" aria-hidden="true">
        <span />
        <span />
        <span />
    </span>
);

export function GroupFace({ item, stats, typing }: any) {
    return (
        <div className="user_badge messages_group_face">
            <div className="user_badge_avatar">
                <img src={imageSrc(item?.photo, DefaultProfileAvatar)} alt="" />
            </div>
            <div className="user_badge_info">
                <div className="messages_group_title_row">
                    <p className="user_badge_info_name">
                        {item?.title || 'Group'}
                    </p>
                    {typing ? (
                        <p className="messages_group_typing">
                            <span className="messages_group_typing_names">
                                {typing}
                            </span>
                            <span className="messages_group_typing_label">
                                Typing
                            </span>
                            <TypingDots />
                        </p>
                    ) : stats ? (
                        <p className="messages_group_subtitle">{stats}</p>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

export function UserSearchSelect({
    excludeIds = [],
    onPick,
    placeholder = 'Search by nickname',
    className = '',
    disabled = false,
}: any) {
    const [options, setOptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const excludeKey = excludeIds.map(String).join(',');
    const timerRef = useRef<number | null>(null);
    const requestRef = useRef(0);
    const lastNeedleRef = useRef('');

    const reset = () => {
        if (timerRef.current) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        requestRef.current += 1;
        lastNeedleRef.current = '';
        setLoading(false);
        setOptions([]);
    };

    const handleInput = (raw: string) => {
        const needle = String(raw || '')
            .trim()
            .replace(/^@/, '');

        if (needle.length < 2) {
            reset();
            return;
        }

        if (needle === lastNeedleRef.current) {
            return;
        }

        if (timerRef.current) {
            window.clearTimeout(timerRef.current);
        }
        setLoading(true);

        timerRef.current = window.setTimeout(async () => {
            timerRef.current = null;
            const requestId = requestRef.current + 1;
            requestRef.current = requestId;
            lastNeedleRef.current = needle;

            const users = await searchUsers(needle);
            if (requestId !== requestRef.current) {
                return;
            }

            const excluded = new Set(excludeKey.split(',').filter(Boolean));
            const next = (Array.isArray(users) ? users : [])
                .filter(
                    (user: any) => user?._id && !excluded.has(String(user._id)),
                )
                .map((user: any) => ({
                    value: String(user._id),
                    name: user.nick_name || 'User',
                    user,
                    render: () => <UserBadge data={user} asLink={false} />,
                }));

            setOptions(next);
            setLoading(false);
        }, 300);
    };

    useEffect(
        () => () => {
            if (timerRef.current) {
                window.clearTimeout(timerRef.current);
            }
        },
        [],
    );

    return (
        <SearchSelect
            className={className}
            options={options}
            placeholder={placeholder}
            emptyLabel="Nothing found"
            loading={loading}
            disabled={disabled}
            minSearchLength={2}
            clearOnSelect
            onInput={handleInput}
            onSelect={(option: any) => {
                reset();
                if (option?.user) {
                    onPick(option.user);
                }
            }}
        />
    );
}

const imageDropProps = {
    dropFileType: 'image/*',
    fileTypes: 'SVG, PNG, JPEG, JPG, and others',
};

export const ModalAvatar = ({ src }: any) => (
    <img
        className="messages_modal_avatar"
        src={imageSrc(src, DefaultProfileAvatar)}
        alt=""
    />
);

export function JoinGroupPrompt({ invite, onAccept, onDecline }: any) {
    const [isJoining, setIsJoining] = useState(false);
    const count = Number(invite?.member_count) || 0;

    return (
        <div className="messages_modal_body">
            {invite?.description ? (
                <Panel title="About">
                    <PanelRow>
                        <span className="messages_join_description">
                            {invite.description}
                        </span>
                    </PanelRow>
                </Panel>
            ) : null}
            <MetaGrid
                items={[
                    {
                        label: 'Participants',
                        value: count,
                        icon: <PeoplesIcon />,
                    },
                    {
                        label: 'Type',
                        value: 'Group chat',
                        icon: <InfoIcon />,
                    },
                ]}
            />
            <ModalFooter hint="You will join as a participant">
                <ActionButton onClick={onDecline} disabled={isJoining}>
                    Decline
                </ActionButton>
                <PrimaryButton
                    isLoading={isJoining}
                    onClick={async () => {
                        if (isJoining) return;
                        setIsJoining(true);
                        try {
                            await onAccept();
                        } finally {
                            setIsJoining(false);
                        }
                    }}
                >
                    Join chat
                </PrimaryButton>
            </ModalFooter>
        </div>
    );
}

export function CreateGroupForm({
    profileId,
    showToast,
    onClose,
    onCreated,
}: any) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [photo, setPhoto] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const excludeIds = useMemo(
        () => [profileId, ...members.map((member) => member._id)],
        [profileId, members],
    );

    const handleCreate = async () => {
        const title = name.trim();
        if (title.length < FIELD_LIMITS.groupName.min || isSaving) {
            return;
        }

        setIsSaving(true);
        let result;
        try {
            result = await createGroup(
                {
                    name: title,
                    description: description.trim(),
                    memberIds: members.map((member) => member._id),
                },
                photo,
            );
        } finally {
            setIsSaving(false);
        }

        if (!result?.status) {
            showToast?.({
                type: 'error',
                message: result?.message || 'Could not create the group',
            });
            return;
        }

        onCreated(result.data);
        onClose();
    };

    return (
        <div className="messages_group_form messages_modal_body">
            <Panel title="About">
                <div className="messages_panel_fields">
                    <DropFile
                        value={photo}
                        setValue={setPhoto}
                        disabled={isSaving}
                        {...imageDropProps}
                    />
                    <InputField
                        value={name}
                        placeholder="Group name"
                        disabled={isSaving}
                        length={FIELD_LIMITS.groupName.max}
                        onChange={(event: any) => setName(event.target.value)}
                    />
                    <InputField
                        value={description}
                        placeholder="Description (optional)"
                        isMultiline
                        multilineRows={3}
                        disabled={isSaving}
                        length={FIELD_LIMITS.groupDescription.max}
                        onChange={(event: any) =>
                            setDescription(event.target.value)
                        }
                    />
                </div>
            </Panel>
            <Panel
                title={`Participants${members.length ? ` · ${members.length}` : ''}`}
            >
                <div className="messages_panel_fields">
                    <UserSearchSelect
                        excludeIds={excludeIds}
                        placeholder="Add people"
                        disabled={isSaving}
                        onPick={(user: any) =>
                            setMembers((current) =>
                                current.some(
                                    (member) =>
                                        String(member._id) === String(user._id),
                                )
                                    ? current
                                    : [...current, user],
                            )
                        }
                    />
                </div>
                {members.map((member) => (
                    <UserRow
                        key={member._id}
                        className="messages_group_member"
                        user={member}
                        asLink={false}
                        status={false}
                        trailing={
                            <button
                                type="button"
                                className="messages_panel_text_button app-transition"
                                disabled={isSaving}
                                onClick={() =>
                                    setMembers((current) =>
                                        current.filter(
                                            (item) =>
                                                String(item._id) !==
                                                String(member._id),
                                        ),
                                    )
                                }
                            >
                                Remove
                            </button>
                        }
                    />
                ))}
            </Panel>
            <ModalFooter hint="You will be the administrator">
                <ActionButton onClick={onClose} disabled={isSaving}>
                    Cancel
                </ActionButton>
                <PrimaryButton
                    isLoading={isSaving}
                    disabled={name.trim().length < FIELD_LIMITS.groupName.min}
                    onClick={handleCreate}
                >
                    Create
                </PrimaryButton>
            </ModalFooter>
        </div>
    );
}

export function openGroupShareModal({
    group,
    showModalWindow,
    showToast,
    onClose,
    onBackToInfo,
}: any) {
    showModalWindow?.({
        title: 'Share',
        size: 'small',
        showCloseButton: true,
        closeFunc: () => {},
        content: (
            <SharePostModal
                sharePath={`/messages/${group._id}`}
                postTitle={group.title || 'Group'}
                linkLabel="Link to the chat"
                excludeConversationId={group._id}
                sentLabel="Link sent to the chat"
                failLabel="Could not send the link"
                loginHint="Log in to send this chat as a message."
                showToast={showToast}
                requestCloseModal={onClose}
                onBack={onBackToInfo}
            />
        ),
    });
}

export function GroupSettings({
    conversation,
    profileId,
    showToast,
    showModalWindow,
    onClose,
    onUpdated,
    onLeft,
    onBackToInfo,
}: any) {
    const [group, setGroup] = useState(conversation);
    const [name, setName] = useState(conversation?.title || '');
    const [description, setDescription] = useState(
        conversation?.description || '',
    );
    const [photo, setPhoto] = useState<any>(null);
    const [removePhoto, setRemovePhoto] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const isLocked = isSaving || isAdding;
    const isAdmin = group?.my_role === 'admin';

    const apply = (data: any) => {
        if (data?.left || data?.kind !== 'group') {
            onLeft(group._id);
            onClose();
            return;
        }
        setGroup(data);
        setName(data.title || '');
        setDescription(data.description || '');
        setPhoto(null);
        setRemovePhoto(false);
        onUpdated(data);
    };

    const fail = (result: any, fallback: string) => {
        showToast?.({
            type: 'error',
            message: result?.message || fallback,
        });
    };

    const handleSave = async () => {
        if (isLocked) {
            return;
        }
        setIsSaving(true);
        let result;
        try {
            result = await updateGroup(
                group._id,
                {
                    name: name.trim(),
                    description: description.trim(),
                    removePhoto: removePhoto && !(photo instanceof File),
                },
                photo instanceof File ? photo : null,
            );
        } finally {
            setIsSaving(false);
        }
        if (!result?.status) {
            fail(result, 'Could not update the group');
            return;
        }
        apply(result.data);
        showToast?.({ type: 'success', message: 'Group updated' });
        onClose();
    };

    const handleAdd = async (user: any) => {
        if (isLocked) {
            return;
        }
        setIsAdding(true);
        let result;
        try {
            result = await addGroupMember(group._id, user._id);
        } finally {
            setIsAdding(false);
        }
        if (!result?.status) {
            fail(result, 'Could not add this person');
            return;
        }
        apply(result.data);
    };

    // Both changes show in the list at once and are undone for that member
    // only if the server refuses.
    const handleRemove = async (userId: any) => {
        const list = Array.isArray(group?.members) ? group.members : [];
        const index = list.findIndex(
            (item: any) => String(item._id) === String(userId),
        );
        const member = list[index];

        setGroup((current: any) => ({
            ...current,
            members: (current?.members || []).filter(
                (item: any) => String(item._id) !== String(userId),
            ),
        }));

        const result = await removeGroupMember(group._id, userId);
        if (!result?.status) {
            if (member) {
                setGroup((current: any) => {
                    const next = [...(current?.members || [])];
                    if (
                        next.some(
                            (item: any) => String(item._id) === String(userId),
                        )
                    ) {
                        return current;
                    }
                    next.splice(Math.min(index, next.length), 0, member);
                    return { ...current, members: next };
                });
            }
            fail(result, 'Could not remove this person');
            return;
        }
        apply(result.data);
    };

    const handleRole = async (userId: any, role: string) => {
        const previous = (group?.members || []).find(
            (item: any) => String(item._id) === String(userId),
        )?.role;
        const setRole = (value: any) =>
            setGroup((current: any) => ({
                ...current,
                members: (current?.members || []).map((item: any) =>
                    String(item._id) === String(userId)
                        ? { ...item, role: value }
                        : item,
                ),
            }));

        setRole(role);
        const result = await updateGroupMemberRole(group._id, userId, role);
        if (!result?.status) {
            setRole(previous);
            fail(result, 'Could not change the role');
            return;
        }
        apply(result.data);
    };

    const members = Array.isArray(group?.members) ? group.members : [];
    const excludeIds = [profileId, ...members.map((member: any) => member._id)];

    const openShare = () =>
        openGroupShareModal({
            group,
            showModalWindow,
            showToast,
            onClose,
            onBackToInfo,
        });

    const leaveGroup = async () => {
        setIsLeaving(true);
        let result;
        try {
            result = await removeGroupMember(group._id, profileId);
        } finally {
            setIsLeaving(false);
        }
        if (!result?.status) {
            fail(result, 'Could not leave the group');
            return;
        }
        apply({ left: true });
    };

    const handleLeave = () => {
        if (isLocked || isLeaving) {
            return;
        }
        showModalWindow?.({
            title: 'Leave this group?',
            subtitle: group.title || 'Group',
            icon: <LogoutIcon />,
            size: 'small',
            showCloseButton: false,
            closeFunc: () => {},
            content: (
                <p className="messages_modal_text">
                    You will stop receiving messages from it.
                </p>
            ),
            footer: (
                <>
                    <span />
                    <div className="modal_window_body_footer_actions">
                        <CancelButton onClick={onBackToInfo}>
                            Cancel
                        </CancelButton>
                        <DangerButton onClick={() => void leaveGroup()}>
                            Leave
                        </DangerButton>
                    </div>
                </>
            ),
        });
    };

    return (
        <div className="messages_group_form messages_modal_body">
            <Panel title="About">
                <div className="messages_panel_fields">
                    <DropFile
                        value={
                            photo instanceof File
                                ? photo
                                : removePhoto
                                  ? null
                                  : group?.photo
                        }
                        previewUrl={removePhoto ? null : group?.photo}
                        setValue={(file: any) => {
                            setPhoto(file instanceof File ? file : null);
                            setRemovePhoto(!(file instanceof File));
                        }}
                        onRemove={() => {
                            setPhoto(null);
                            setRemovePhoto(true);
                        }}
                        disabled={isLocked}
                        {...imageDropProps}
                    />
                    <InputField
                        value={name}
                        placeholder="Group name"
                        disabled={isLocked}
                        length={FIELD_LIMITS.groupName.max}
                        onChange={(event: any) => setName(event.target.value)}
                    />
                    <InputField
                        value={description}
                        placeholder="Description (optional)"
                        isMultiline
                        multilineRows={3}
                        disabled={isLocked}
                        length={FIELD_LIMITS.groupDescription.max}
                        onChange={(event: any) =>
                            setDescription(event.target.value)
                        }
                    />
                    <ActionButton
                        className="messages_group_share"
                        disabled={isLocked}
                        onClick={openShare}
                    >
                        <ShareIcon />
                        Share
                    </ActionButton>
                </div>
            </Panel>
            <Panel title={`Participants · ${members.length}`}>
                <div className="messages_panel_fields">
                    <UserSearchSelect
                        excludeIds={excludeIds}
                        placeholder="Add people"
                        disabled={isLocked}
                        onPick={handleAdd}
                    />
                </div>
                {members.map((member: any) => {
                    const isSelf = String(member._id) === String(profileId);
                    return (
                        <UserRow
                            key={member._id}
                            className="messages_group_member"
                            user={member}
                            viewerId={profileId}
                            trailing={
                                <>
                                    <Pill
                                        tone={
                                            member.role === 'admin'
                                                ? 'info'
                                                : 'neutral'
                                        }
                                    >
                                        {roleLabel(member.role)}
                                    </Pill>
                                    {isAdmin && !isSelf ? (
                                        <Popup
                                            body={
                                                isLocked
                                                    ? []
                                                    : [
                                                          [
                                                              {
                                                                  title:
                                                                      member.role ===
                                                                      'admin'
                                                                          ? 'Make participant'
                                                                          : 'Make administrator',
                                                                  onClick: () =>
                                                                      handleRole(
                                                                          member._id,
                                                                          member.role ===
                                                                              'admin'
                                                                              ? 'member'
                                                                              : 'admin',
                                                                      ),
                                                              },
                                                              {
                                                                  title: 'Remove',
                                                                  type: 'danger',
                                                                  onClick: () =>
                                                                      handleRemove(
                                                                          member._id,
                                                                      ),
                                                              },
                                                          ],
                                                      ]
                                            }
                                        >
                                            <button
                                                type="button"
                                                disabled={isLocked}
                                                className="messages_group_member_menu app-transition"
                                                aria-label="Member actions"
                                            >
                                                <ThreeDotsIcon />
                                            </button>
                                        </Popup>
                                    ) : null}
                                </>
                            }
                        />
                    );
                })}
            </Panel>
            <ModalFooter>
                <DangerButton
                    isLoading={isLeaving}
                    disabled={isLocked}
                    onClick={handleLeave}
                >
                    <LogoutIcon />
                    Leave group
                </DangerButton>
                <PrimaryButton
                    isLoading={isSaving}
                    disabled={
                        isAdding ||
                        isLeaving ||
                        name.trim().length < FIELD_LIMITS.groupName.min
                    }
                    onClick={handleSave}
                >
                    Save
                </PrimaryButton>
            </ModalFooter>
        </div>
    );
}
