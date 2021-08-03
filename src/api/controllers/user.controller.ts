import express from 'express';

import { UserService } from '../../services/user.service';
import { ResponseHandler } from '../../common/response.handler';
import { Loader } from '../../startup/loader';
import { Authorizer } from '../../auth/authorizer';
import { UserDetailsDto } from '../../data/domain.types/user.domain.types';
import { UserValidator } from '../validators/user.validator';

///////////////////////////////////////////////////////////////////////////////////////

export class UserController {

    //#region member variables and constructors

    _service: UserService = null;

    _authorizer: Authorizer = null;

    constructor() {
        this._service = Loader.container.resolve(UserService);
        this._authorizer = Loader.authorizer;
    }

    //#endregion

    getById = async (request: express.Request, response: express.Response): Promise<void> => {
        try {
            request.context = 'User.GetById';
            await this._authorizer.authorize(request, response);

            const id: string = await UserValidator.getById(request);
            const user = await this._service.getById(id);
            if (user == null) {
                ResponseHandler.failure(request, response, 'User not found.', 404);
                return;
            }
            ResponseHandler.success(request, response, 'User retrieved successfully!', 200, {
                user : user,
            });
        } catch (error) {
            ResponseHandler.handleError(request, response, error);
        }
    };

    // search = async (request: express.Request, response: express.Response): Promise<void> => {
    //     try {
    //         request.context = 'User.Search';
    //         if (!this._authorizer.authorize(request, response)) {
    //             return false;
    //         }
    //         var filters = await UserInputValidator.search(request, response);

    //         var extractFull: boolean =
    //             request.query.full != 'undefined' && typeof request.query.full == 'boolean'
    //                 ? request.query.full
    //                 : false;

    //         const users = await this._service.search(filters, extractFull);
    //         if (users != null) {
    //             var count = users.length;
    //             var message =
    //                 count == 0 ? 'No records found!' : `Total ${count} user records retrieved successfully!`;
    //             ResponseHandler.success(request, response, message, 200, {
    //                 users: users,
    //             });
    //             return;
    //         }
    //     } catch (error) {
    //         ResponseHandler.handleError(request, response, error);
    //     }
    // };

    loginWithPassword = async (request: express.Request, response: express.Response): Promise<void> => {
        try {
            request.context = 'User.LoginWithPassword';

            const loginObject = await UserValidator.loginWithPassword(request, response);
            const userDetails = await this._service.loginWithPassword(loginObject);
            if (userDetails == null) {
                ResponseHandler.failure(request, response, 'User not found!', 404);
                return;
            }

            const user: UserDetailsDto = userDetails.user;
            const accessToken = userDetails.accessToken;
            const message = `User '${user.Person.DisplayName}' logged in successfully!`;
            const data = {
                AccessToken : accessToken,
                User        : user,
            };

            ResponseHandler.success(request, response, message, 200, data, true);

        } catch (error) {
            ResponseHandler.handleError(request, response, error);
        }
    };

    generateOtp = async (request: express.Request, response: express.Response): Promise<void> => {
        try {
            request.context = 'User.GenerateOtp';
            const obj = UserValidator.generateOtp(request, response);
            const entity = await this._service.generateOtp(obj);
            ResponseHandler.success(request, response, 'OTP has been successfully generated!', 200, {
                entity : entity,
            });
        } catch (error) {
            ResponseHandler.handleError(request, response, error);
        }
    };

    loginWithOtp = async (request: express.Request, response: express.Response): Promise<void> => {
        try {
            request.context = 'User.LoginWithPassword';

            const loginObject = await UserValidator.loginWithOtp(request, response);
            const userDetails = await this._service.loginWithOtp(loginObject);
            if (userDetails == null) {
                ResponseHandler.failure(request, response, 'User not found!', 404);
                return;
            }

            const user: UserDetailsDto = userDetails.user;
            const accessToken = userDetails.accessToken;
            const message = `User '${user.Person.DisplayName}' logged in successfully!`;
            const data = {
                AccessToken : accessToken,
                User        : user,
            };

            ResponseHandler.success(request, response, message, 200, data, true);

        } catch (error) {
            ResponseHandler.handleError(request, response, error);
        }
    };
    
    // resetPassword = async (request: express.Request, response: express.Response): Promise<void> => {
    //     try {
    //         request.context = 'User.ResetPassword';
    //         if (!this._authorizer.authorize(request, response)) {
    //             return false;
    //         }
    //         var obj = UserInputValidator.resetPassword(request, response);
    //         var details = await this._service.resetPassword(obj);
    //         if (details == null) {
    //             ResponseHandler.failure(request, response, 'Unable to reset password!', 404);
    //             return;
    //         }
    //         ResponseHandler.success(request, response, `Password reset successfully!`, 200, {
    //             details: details,
    //         });
    //     } catch (error) {
    //         ResponseHandler.handleError(request, response, error);
    //     }
    // };

}
