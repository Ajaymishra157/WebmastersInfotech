const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const { onSchedule } = require("firebase-functions/v2/scheduler");

initializeApp();
const messaging = getMessaging();

// ⚠️ Apne PHP backend ka base URL yaha daalo (Colors.js ke baseUrl jaisa hi)
const BASE_URL = "https://officepanel.webmastersinfo.in/api_production/";

// ⚠️ Apne ENDPOINTS file ke actual path names ke hisaab se ye do lines adjust karo
const LIST_PROFILE_URL = `${BASE_URL}list_profile.php`;
const LIST_MEMBER_URL = `${BASE_URL}list_member.php`;
const LIST_BIRTHDAY_URL = `${BASE_URL}list_bithday.php`;

/**
 * Helper: ListProfile API call karke ek member ka pura detail (fcm_token, name, etc) laata hai
 */

/**
 * "2026-08-21" ko "21 Aug 2026" me convert karta hai
 */
function formatDateNice(dateStr) {
    if (!dateStr) return "";
    const parts = String(dateStr).split("-");
    if (parts.length !== 3) return dateStr;
    const [yyyy, mm, dd] = parts;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIndex = parseInt(mm, 10) - 1;
    if (monthIndex < 0 || monthIndex > 11) return dateStr;
    return `${dd} ${months[monthIndex]} ${yyyy}`;
}


async function getMemberProfile(memberId) {
    const res = await fetch(LIST_PROFILE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId }),
    });
    const result = await res.json();
    if (result.code == 200) {
        return result.payload;
    }
    return null;
}

/**
 * Helper: ListMember API call karke saare members ki list laata hai
 */
async function getAllMembers() {
    const res = await fetch(LIST_MEMBER_URL, {
        method: "GET",
    });
    const result = await res.json();
    console.log("getAllMembers raw response:", JSON.stringify(result));
    if (result.status) {
        return result.payload;
    }
    return [];
}

/**
 * Helper: ListBirthday API call karke members ki list laata hai (DOB check ke liye)
 */
async function getBirthdayList() {
    const res = await fetch(LIST_BIRTHDAY_URL, {
        method: "GET",
    });
    const result = await res.json();
    console.log("getBirthdayList raw response:", JSON.stringify(result));
    if (result.status) {
        return result.payload;
    }
    return [];
}

/**
 * Helper: List me se CEO aur HR position wale members nikalta hai
 */
function filterCeoAndHr(members) {
    console.log("All members:", JSON.stringify(members));
    return members.filter((m) => {
        const pos = (m.member_position || m.position || "").trim().toLowerCase();
        return pos === "ceo" || pos === "hr";
    });
}

/**
 * ENDPOINT 1
 * App is function ko call karega jab staff leave apply karne ke baad
 * PHP AddLeave API successful ho chuki ho.
 *
 * Expected POST body: { "member_id": 89, "reason": "family problem" }
 */
exports.notifyLeaveRequest = onRequest(async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ success: false, message: "Method Not Allowed" });
    }

    console.log("🔥 Received body:", JSON.stringify(req.body)); // 👈 YE ADD KARO

    const { member_id, reason } = req.body || {};
    if (!member_id) {
        return res.status(400).json({ success: false, message: "member_id required" });
    }

    try {
        const staffProfile = await getMemberProfile(member_id);
        if (!staffProfile) {
            return res.status(404).json({ success: false, message: "Staff profile not found" });
        }
        const staffName = staffProfile.member_name;

        const allMembers = await getAllMembers();
        const approvers = filterCeoAndHr(allMembers);

        // ---- FIXED: jisne leave apply ki hai (chahe wo khud CEO/HR ho), usko exclude karo ----
        const applicantId = String(member_id).trim();
        const filteredApprovers = approvers.filter(
            (a) => String(a.member_id).trim() !== applicantId
        );

        if (filteredApprovers.length === 0) {
            return res.status(200).json({ success: false, message: "No CEO/HR found (excluding applicant)" });
        }

        const tokens = [];
        for (const approver of filteredApprovers) {
            const approverId = approver.member_id || approver.id;
            const profile = await getMemberProfile(approverId);
            if (profile?.fcm_token) {
                tokens.push(profile.fcm_token);
            }
        }

        if (tokens.length === 0) {
            return res.status(200).json({ success: false, message: "No fcm tokens found for approvers" });
        }
        const message = {
            data: {
                type: "leave_request",
                staff_id: String(member_id),
                leave_id: String(req.body.leave_id || ""),
                member_name: staffName,
                from_date: String(req.body.from_date || ""),
                to_date: String(req.body.to_date || ""),
                leave_type: String(req.body.leave_type || ""),
                reason: String(reason || ""), // 👈 NAYA
            },
            android: { priority: "high" },
            apns: {
                headers: { "apns-priority": "10" },
                payload: { aps: { "content-available": 1 } },
            },
            tokens: tokens,
        };

        const response = await messaging.sendEachForMulticast(message);
        console.log(`Leave request notif sent: ${response.successCount} success, ${response.failureCount} failed`);
        return res.status(200).json({ success: true, successCount: response.successCount });
    } catch (error) {
        console.error("notifyLeaveRequest error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * ENDPOINT 2
 * App is function ko call karega jab CEO/HR approve/reject karne ke baad
 * PHP ChangeLeaveStatus API successful ho chuki ho.
 *
 * Expected POST body: { "staff_id": 89, "status": "Approve" }  // ya "Reject"
 */
exports.notifyLeaveResponse = onRequest(async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ success: false, message: "Method Not Allowed" });
    }

    const { staff_id, status, from_date, to_date } = req.body || {};
    if (!staff_id || !status) {
        return res.status(400).json({ success: false, message: "staff_id and status required" });
    }

    try {
        const staffProfile = await getMemberProfile(staff_id);
        if (!staffProfile?.fcm_token) {
            return res.status(200).json({ success: false, message: "Staff has no fcm_token" });
        }

        const isApproved = status.toLowerCase() === "approve";
        const statusLabel = isApproved ? "Approved" : "Rejected";
        const statusIcon = isApproved ? "✓" : "✗";
        const notifColor = isApproved ? "#86EFAC" : "#FCA5A5"; // halka green / halka red

        const dateRange = (from_date && to_date) ? ` (${formatDateNice(from_date)} to ${formatDateNice(to_date)})` : "";

        const message = {
            notification: {
                title: `${statusIcon} Leave Request ${statusLabel}`,
                body: `Your leave request${dateRange} has been ${statusLabel.toLowerCase()}`,
            },
            data: {
                type: "leave_response",
                staff_id: String(staff_id),
                status: status,
            },
            android: {
                notification: {
                    color: notifColor,
                },
            },
            token: staffProfile.fcm_token,
        };

        await messaging.send(message);
        console.log(`Leave response notif sent to staff ${staff_id}`);

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("notifyLeaveResponse error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Roz subah 10:00 AM (IST) pe automatically chalega.
 * Jitne members ka aaj birthday hai, unke naam ke sath CEO/HR ko notification jayega.
 */
exports.notifyTodayBirthdays = onSchedule(
    {
        schedule: "0 8 * * *",
        timeZone: "Asia/Kolkata",
    },
    async (event) => {
        try {
            // ---- DOB list_bithday.php se aayegi (dob ke liye ye reliable hai) ----
            const birthdayList = await getBirthdayList();

            const today = new Date();
            const todayDay = today.getDate();
            const todayMonth = today.getMonth() + 1;

            const todaysBirthdayMembers = birthdayList.filter((m) => {
                if (!m.member_dob || m.member_dob === "0000-00-00") return false;
                const dobParts = m.member_dob.split("-");
                const dobMonth = parseInt(dobParts[1], 10);
                const dobDay = parseInt(dobParts[2], 10);
                return dobDay === todayDay && dobMonth === todayMonth;
            });

            if (todaysBirthdayMembers.length === 0) {
                console.log("Aaj kisi ka bhi birthday nahi hai.");
                return null;
            }

            console.log("Aaj birthday hai:", JSON.stringify(todaysBirthdayMembers));

            // ---- Recipients ke liye poori member list chahiye ----
            const allMembers = await getAllMembers();

            for (const member of todaysBirthdayMembers) {
                const birthdayMemberId = String(member.member_id).trim();

                const recipientList = allMembers.filter(
                    (m) => String(m.member_id).trim() !== birthdayMemberId
                );

                console.log(
                    `Birthday: ${member.member_name} (ID: ${birthdayMemberId}) -> excluded from ${allMembers.length} total, recipients: ${recipientList.length}`
                );

                // ---- NEW: Birthday member ko khud "Happy Birthday" personal message bhejo ----
                try {
                    const selfProfile = await getMemberProfile(birthdayMemberId);
                    if (selfProfile?.fcm_token) {
                        const selfMessage = {
                            notification: {
                                title: "🎉 Happy Birthday!",
                                body: `Happy Birthday ${member.member_name}! Aapka din shubh ho 🎂`,
                            },
                            data: {
                                type: "birthday_self",
                                member_id: birthdayMemberId,
                                member_name: member.member_name,
                            },
                            token: selfProfile.fcm_token,
                        };
                        await messaging.send(selfMessage);
                        console.log(`Self birthday wish sent to ${member.member_name}`);
                    } else {
                        console.log(`No fcm_token found for birthday member ${member.member_name}`);
                    }
                } catch (selfError) {
                    console.error(`Error sending self birthday wish to ${member.member_name}:`, selfError);
                }

                if (recipientList.length === 0) {
                    console.log(`No recipients for ${member.member_name}'s birthday`);
                    continue;
                }

                const tokens = [];
                for (const recipient of recipientList) {
                    const recipientId = recipient.member_id || recipient.id;
                    const profile = await getMemberProfile(recipientId);
                    if (profile?.fcm_token) {
                        tokens.push(profile.fcm_token);
                    }
                }

                if (tokens.length === 0) {
                    console.log(`No fcm tokens found for ${member.member_name}'s birthday recipients`);
                    continue;
                }

                const message = {
                    notification: {
                        title: "🎂 Birthday Reminder",
                        body: `Aaj ${member.member_name} ka birthday hai!`,
                    },
                    data: {
                        type: "birthday_reminder",
                        member_id: String(member.member_id),
                        member_name: member.member_name,
                    },
                    tokens: tokens,
                };

                const response = await messaging.sendEachForMulticast(message);
                console.log(
                    `Birthday notif sent for ${member.member_name}: ${response.successCount} success, ${response.failureCount} failed`
                );
            }

            return null;
        } catch (error) {
            console.error("notifyTodayBirthdays error:", error);
            return null;
        }
    }
);

/**
 * ENDPOINT 3
 * App is function ko call karega jab CEO Rules/Announcement update kare
 * PHP update_rules_announce API successful ho chuki ho.
 *
 * Expected POST body: { "type": "rules" | "announcements", "content": "preview text" }
 */
exports.notifyAnnouncement = onRequest(async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ success: false, message: "Method Not Allowed" });
    }

    const { type, content, editor_id } = req.body || {};

    try {
        const allMembers = await getAllMembers();

        // ✅ LIVE MODE: editor ko chhodkar (chahe CEO ho ya HR) BAAKI SABKO notification
        // jayegi — HR update kare to HR ko chhodkar sabko (CEO included), CEO update kare
        // to CEO ko chhodkar sabko (HR + Staff + PM included).
        const recipients = allMembers.filter((m) => {
            const id = String(m.member_id || m.id).trim();
            return id !== String(editor_id).trim();
        });

        // ---- LIVE MODE (testing complete hone ke baad ye use karna): ----
        // editor_id ko chhodkar (chahe CEO ho ya HR) BAAKI SABKO notification jayegi,
        // position-based exclude ki zaroorat nahi — jisne update kiya bas usko chhodo
        // const recipients = allMembers.filter((m) => {
        //     const id = String(m.member_id || m.id).trim();
        //     return id !== String(editor_id).trim();
        // });

        if (recipients.length === 0) {
            return res.status(200).json({ success: false, message: "No recipients found" });
        }

        const tokens = [];
        for (const recipient of recipients) {
            const recipientId = recipient.member_id || recipient.id;
            const profile = await getMemberProfile(recipientId);
            if (profile?.fcm_token) {
                tokens.push(profile.fcm_token);
            }
        }

        if (tokens.length === 0) {
            return res.status(200).json({ success: false, message: "No fcm tokens found for recipients" });
        }

        const isRules = type === "rules";
        const title = isRules ? "📋 Rules Updated" : "📢 New Announcement";

        // NAYA: content ka half-cut preview dikhane ki jagah, ab ek clean fixed
        // message dikhega — content 100 chars pe kaate jaane se ajeeb lagta tha
        const body = isRules
            ? "Company rules have been updated. Tap to view the latest rules."
            : "A new announcement has been posted. Tap to view details.";

        const message = {
            notification: {
                title: title,
                body: body,
            },
            data: {
                type: "announcement",
                announce_type: type || "announcements",
                screen: "Rules",
            },
            android: { priority: "high" },
            apns: {
                headers: { "apns-priority": "10" },
                payload: { aps: { "content-available": 1 } },
            },
            tokens: tokens,
        };

        const response = await messaging.sendEachForMulticast(message);
        console.log(`Announcement notif sent: ${response.successCount} success, ${response.failureCount} failed`);
        return res.status(200).json({ success: true, successCount: response.successCount });
    } catch (error) {
        console.error("notifyAnnouncement error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});