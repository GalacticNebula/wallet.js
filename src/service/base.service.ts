import { pushTask } from "@common/mq";
import { WORKER_QUEUE } from "@config/env";

class BaseService {

    public async notify(order_id: number) {
      await pushTask(WORKER_QUEUE, { action: 'callback', data: { order_id } });
    }
}

export default BaseService;