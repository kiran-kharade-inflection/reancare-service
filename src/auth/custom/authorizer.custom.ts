import express from 'express';
import jwt from 'jsonwebtoken';

import { Logger } from '../../common/logger';
import { IAuthorizer } from '../authorizer.interface';
import { CurrentUser } from '../../domain.types/current.user';
import { RolePrivilegeService } from '../../services/role.privilege.service';
import { Loader } from '../../startup/loader';

//const execSync = require('child_process').execSync;

//////////////////////////////////////////////////////////////

export class Authorizer_custom implements IAuthorizer {

    _rolePrivilegeService: RolePrivilegeService = null;

    constructor() {
        this._rolePrivilegeService = Loader.container.resolve(RolePrivilegeService);
    }

    public authorize = async (request: express.Request): Promise<boolean> => {
        try {
            const currentUser = request.currentUser;
            const context = request.context;
            if (context == null || context === 'undefined') {
                return false;
            }
            if (currentUser == null) {
                return false;
            }
            const hasPrivilege = await this.hasRolePrivileges(currentUser.CurrentRoleId, context);
            if (!hasPrivilege) {
                return false;
            }
            const isResourceOwner = await this.isResourceOwner(currentUser, request);
            const hasConsent = await this.hasConsent(currentUser.CurrentRoleId, context);
            if (hasConsent || isResourceOwner) {
                return true;
            }
            return false;
        } catch (error) {
            Logger.instance().log(error.message);
        }
        return false;
    };

    public generateUserSessionToken = async (user: CurrentUser): Promise<string> => {
        return new Promise((resolve, reject) => {
            try {
                const token = jwt.sign(user, process.env.USER_ACCESS_TOKEN_SECRET, { expiresIn: '90d' });
                resolve(token);
            } catch (error) {
                reject(error);
            }
        });
    };

    private hasRolePrivileges = async (currentRoleId: number, context: string): Promise<boolean> => {
        const rolePrivileges = await this._rolePrivilegeService.getPrivilegesForRole(currentRoleId);
        if (rolePrivileges.length === 0) {
            return false;
        }
        const privileges: string[] = rolePrivileges.map((x) => {
            return x.Privilege.toLowerCase();
        });
        const contextLower = context.toLowerCase();
        const found = privileges.find((x) => {
            return x === contextLower;
        });
        if (!found) {
            return false;
        }
        return true;
    };

    private isResourceOwner = async (user: CurrentUser, request: express.Request): Promise<boolean> => {
        if (request.resourceOwnerUserId === user.UserId) {
            return true;
        }
        return false;
    };

    private hasConsent = async (currentRoleId: number, context: string): Promise<boolean> => {

        Logger.instance().log('Current role id: ' + currentRoleId);
        Logger.instance().log('Context: ' + context);

        //for time being, return true always
        return true;
    };

}
