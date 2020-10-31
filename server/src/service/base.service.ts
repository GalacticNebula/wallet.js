import { WORKER_QUEUE } from "@common/constants";
import { pushTask } from "@common/mq";

class BaseService {

    public async notify(order_id: number) {
      await pushTask(WORKER_QUEUE, { action: 'callback', data: { order_id } });
    }
}

export default BaseService;