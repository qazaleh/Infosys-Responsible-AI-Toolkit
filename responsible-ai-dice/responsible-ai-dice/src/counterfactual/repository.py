from __future__ import annotations

import os
import time
from datetime import datetime
from typing import Any, Iterable, List, Sequence

import pymongo
from dotenv import load_dotenv
from gridfs import GridFS


load_dotenv()


class WorkbenchRepository:
    def __init__(self) -> None:
        db_type = os.getenv('DB_TYPE', 'mongo').lower()
        if db_type != 'mongo':
            raise ValueError(f'Unsupported DB_TYPE for DiCE service: {db_type}')

        mongo_path = os.getenv('MONGO_PATH')
        db_name = os.getenv('DB_NAME')
        if not mongo_path or not db_name:
            raise ValueError('MONGO_PATH and DB_NAME must be configured for the DiCE service.')

        self.client = pymongo.MongoClient(mongo_path)
        self.db = self.client[db_name]
        self.fs = GridFS(self.db)

    def ping(self) -> bool:
        self.client.admin.command('ping')
        return True

    def _ordered_attribute_ids(
        self,
        collection_name: str,
        id_field_name: str,
        name_field_name: str,
        requested_names: Sequence[str],
    ) -> List[Any]:
        documents = list(
            self.db[collection_name].find(
                {name_field_name: {'$in': list(requested_names)}},
                {'_id': 0, id_field_name: 1, name_field_name: 1},
            )
        )
        documents.sort(key=lambda item: list(requested_names).index(item[name_field_name]))
        if not documents:
            raise ValueError(f'Unable to resolve attributes from {collection_name}: {requested_names}')
        return [item[id_field_name] for item in documents]

    def get_model_record(self, model_id: float) -> dict[str, Any]:
        record = self.db['Model'].find_one(
            {'ModelId': float(model_id)},
            {'_id': 0, 'ModelId': 1, 'ModelName': 1, 'ModelData': 1, 'ModelEndPoint': 1},
        )
        if not record:
            raise FileNotFoundError(f'Model with modelId {model_id} was not found.')
        return record

    def get_model_attribute_values(
        self,
        model_id: float,
        attribute_names: Sequence[str],
        batch_id: float | None = None,
    ) -> List[Any]:
        attribute_ids = self._ordered_attribute_ids(
            'ModelAttributes', 'ModelAttributeId', 'ModelAttributeName', attribute_names
        )
        query: dict[str, Any] = {
            'ModelId': float(model_id),
            'ModelAttributeId': {'$in': attribute_ids},
            '$or': [{'IsActive': 'Y'}, {'IsActive': {'$exists': False}}],
        }
        if batch_id is not None:
            query['BatchId'] = float(batch_id)
        documents = list(
            self.db['ModelAttributesValues'].find(
                query,
                {'_id': 0, 'ModelAttributeId': 1, 'ModelAttributeValues': 1},
            )
        )
        documents.sort(key=lambda item: attribute_ids.index(item['ModelAttributeId']))
        if not documents:
            raise ValueError(
                f'No model attribute values found for modelId {model_id} and attributes {list(attribute_names)}.'
            )
        return [item['ModelAttributeValues'] for item in documents]

    def get_dataset_record(self, dataset_id: float) -> dict[str, Any]:
        record = self.db['Dataset'].find_one(
            {'DataId': float(dataset_id)},
            {'_id': 0, 'DataId': 1, 'DataSetName': 1, 'SampleData': 1},
        )
        if not record:
            raise FileNotFoundError(f'Dataset with datasetId {dataset_id} was not found.')
        return record

    def get_dataset_attribute_values(
        self,
        dataset_id: float,
        attribute_names: Sequence[str],
    ) -> List[Any]:
        attribute_ids = self._ordered_attribute_ids(
            'DataAttributes', 'DataAttributeId', 'DataAttributeName', attribute_names
        )
        documents = list(
            self.db['DataAttributesValues'].find(
                {'DataId': float(dataset_id), 'DataAttributeId': {'$in': attribute_ids}},
                {'_id': 0, 'DataAttributeId': 1, 'DataAttributeValues': 1},
            )
        )
        documents.sort(key=lambda item: attribute_ids.index(item['DataAttributeId']))
        if not documents:
            raise ValueError(
                f'No dataset attribute values found for datasetId {dataset_id} and attributes {list(attribute_names)}.'
            )
        return [item['DataAttributeValues'] for item in documents]

    def read_gridfs_file(self, unique_id: Any) -> dict[str, Any]:
        metadata = self.fs.find_one({'_id': unique_id})
        if metadata is None:
            raise FileNotFoundError(f'No file found in GridFS for id {unique_id}.')
        file_object = self.fs.get(metadata._id)
        return {'data': file_object.read(), 'filename': metadata.filename}

    def get_tenet_id(self, tenet_name: str) -> float:
        record = self.db['Tenet'].find_one({'TenetName': tenet_name}, {'_id': 0, 'Id': 1})
        if not record:
            raise ValueError(f'Tenet {tenet_name} was not found.')
        return float(record['Id'])

    def get_batch(self, batch_id: float, tenet_id: float) -> dict[str, Any]:
        record = self.db['Batch'].find_one(
            {'BatchId': float(batch_id), 'TenetId': float(tenet_id)},
            {'_id': 0, 'BatchId': 1, 'ModelId': 1, 'DataId': 1, 'PreprocessorId': 1, 'Title': 1},
        )
        if not record:
            raise ValueError(f'Batch {batch_id} for tenet {tenet_id} was not found.')
        return record

    def update_batch_status(self, batch_id: float, status: str) -> None:
        self.db['Batch'].update_one({'BatchId': float(batch_id)}, {'$set': {'Status': status}})

    def save_file(self, content: bytes, filename: str, content_type: str, tenet: str) -> str:
        file_id = str(time.time())
        with self.fs.new_file(
            _id=file_id,
            filename=filename,
            contentType=content_type,
            tenet=tenet,
        ) as grid_file:
            grid_file.write(content)
        return file_id

    def create_html_record(self, batch_id: float, tenet_id: float, report_name: str, html_file_id: str) -> None:
        html_id = time.time()
        document = {
            'HtmlId': html_id,
            'BatchId': float(batch_id),
            'TenetId': float(tenet_id),
            'ReportName': report_name,
            'HtmlFileId': html_file_id,
            'CreatedDateTime': datetime.now(),
        }
        self.db['Html'].insert_one(document)
