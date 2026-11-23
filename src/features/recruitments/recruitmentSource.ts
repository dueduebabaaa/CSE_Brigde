
import type {
    RecruitmentSource,
} from './recruitmentModel';

import * as service from '../../services/recruitmentService';

// 서비스 오류를 UI에서 처리할 수 있도록 전달
function unwrap<T>(
    response: service.RecruitmentServiceResponse<T>,
): T {
    if (response.error) {
        throw new Error(response.error.message);
    }

    if (response.data === null) {
        throw new Error('서버에서 데이터를 받지 못했습니다.');
    }

    return response.data;
}

// 목록·상세·작성·수정·삭제·지원·승인 연결
export const recruitmentSource: RecruitmentSource = {
    async getRecruitments(filters = {}) {
        const response = await service.getRecruitments({
            status:
                filters.status === 'all'
                    ? undefined
                    : filters.status,
            search: filters.search,
            opportunityId: filters.opportunityId,
        });

        return unwrap(response);
    },

    async getRecruitmentById(id) {
        const response = await service.getRecruitmentById(id);

        if (response.error?.code === 'NOT_FOUND') {
            return null;
        }

        return unwrap(response);
    },

    async createRecruitment(payload) {
        return unwrap(await service.createRecruitment(payload));
    },

    async updateRecruitment(id, updates) {
        return unwrap(
            await service.updateRecruitment(id, updates),
        );
    },

    async deleteRecruitment(id) {
        const response = await service.deleteRecruitment(id);

        if (response.error) {
            throw new Error(response.error.message);
        }
    },

    async applyToRecruitment(recruitmentId, role, message) {
        return unwrap(
            await service.applyToRecruitment(
                recruitmentId,
                role,
                message,
            ),
        );
    },

    async getApplicationsForRecruitment(recruitmentId) {
        return unwrap(
            await service.getApplicationsForRecruitment(
                recruitmentId,
            ),
        );
    },

    async updateApplicationStatus(applicationId, status) {
        return unwrap(
            await service.updateApplicationStatus(
                applicationId,
                status,
            ),
        );
    },
};
