import { userSessionRepository, userRepository } from '@models/index';
import BaseStore from './base.store';

class UserSessionStore extends BaseStore {

  public async getOne(id: string) {
    const session = await userSessionRepository.findOne({
      where: { id },
      include: [{ model: userRepository }]
    });

    return session && session.user && { sess: session.sess, user: session.user.serializer() };
  }

  public async update(uid: number, key: string, sess: any) {
    await userSessionRepository.upsert({ uid, id: key, sess });
  }

  public async destroy(key: string) {
    await userSessionRepository.destroy({ where: { id: key } });
  }

}

export const userSessionStore = new UserSessionStore();
