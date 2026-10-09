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
import UserActivityStatus from '../../components/UserActivityStatus';
import UserBadge from '../../components/UserBadge';
import ActionButton from '../../components/Ui/ActionButton';
import DropFile from '../../components/Ui/DropFile';
import InputField from '../../components/Ui/InputField';
import SharePostModal from '../../components/SharePostModal';
import Popup from '../../components/Ui/Popup';
import PrimaryButton from '../../components/Ui/PrimaryButton';
import SearchSelect from '../../components/Ui/SearchSelect';
import ShareIcon from '../../assets/svg/share.svg';
import { FIELD_LIMITS } from '../../constants/fieldLimits';
import DefaultProfileAvatar from '../../assets/images/default-profile-avatar.png';
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

export function JoinGroupPrompt({ invite, onAccept, onDecline }: any) {
    const [isJoining, setIsJoining] = useState(false);
    const count = Number(invite?.member_count) || 0;

    return (
        <div className="messages_join_prompt">
            <img
                className="messages_join_prompt_photo"
                src={imageSrc(invite?.photo, DefaultProfileAvatar)}
                alt=""
            />
            <p className="messages_join_prompt_title">
                {invite?.title || 'Group'}
            </p>
            <p className="messages_join_prompt_muted">
                {`${count} ${count === 1 ? 'person' : 'people'}`}
            </p>
            {invite?.description ? (
                <p className="messages_join_prompt_description">
                    {invite.description}
                </p>
            ) : null}
            <div className="messages_join_prompt_actions">
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
            </div>
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
        <div className="messages_group_form">
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
                onChange={(event: any) => setDescription(event.target.value)}
            />
            <UserSearchSelect
                excludeIds={excludeIds}
                disabled={isSaving}
                onPick={(user: any) =>
                    setMembers((current) =>
                        current.some(
                            (member) => String(member._id) === String(user._id),
                        )
                            ? current
                            : [...current, user],
                    )
                }
            />
            {members.length ? (
                <ul className="messages_group_members">
                    {members.map((member) => (
                        <li key={member._id} className="messages_group_member">
                            <UserBadge data={member} asLink={false} />
                            <button
                                type="button"
                                className="messages_group_member_remove app-transition"
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
                        </li>
                    ))}
                </ul>
            ) : null}
            <div className="messages_group_form_actions">
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
            </div>
        </div>
    );
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

    const openShare = () => {
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
    };

    return (
        <div className="messages_group_form">
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
                onChange={(event: any) => setDescription(event.target.value)}
            />
            <PrimaryButton
                isLoading={isSaving}
                disabled={
                    isAdding || name.trim().length < FIELD_LIMITS.groupName.min
                }
                onClick={handleSave}
            >
                Save
            </PrimaryButton>
            <div className="messages_group_members_head">
                <p>Participants</p>
            </div>
            <div className="messages_group_add_row">
                <UserSearchSelect
                    className="messages_group_add_search"
                    excludeIds={excludeIds}
                    placeholder="Add people"
                    disabled={isLocked}
                    onPick={handleAdd}
                />
                <button
                    type="button"
                    className="messages_group_share app-transition"
                    aria-label="Share"
                    disabled={isLocked}
                    onClick={openShare}
                >
                    <ShareIcon />
                </button>
            </div>
            <ul className="messages_group_members">
                {members.map((member: any) => {
                    const isSelf = String(member._id) === String(profileId);
                    return (
                        <li key={member._id} className="messages_group_member">
                            <div className="messages_group_member_main">
                                <UserBadge data={member} />
                                <UserActivityStatus
                                    user={member}
                                    viewerId={profileId}
                                    className="messages_activity_status"
                                />
                            </div>
                            <span className="messages_group_role">
                                {roleLabel(member.role)}
                            </span>
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
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
