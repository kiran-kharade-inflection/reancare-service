import { CourseContentDomainModel } from "../../../../domain.types/educational/course.content/course.content.domain.model";
import { CourseContentDto } from "../../../../domain.types/educational/course.content/course.content.dto";
import { CourseContentSearchFilters,
    CourseContentSearchResults
} from "../../../../domain.types/educational/course.content/course.content.search.types";

export interface ICourseContentRepo {

    create(courseContentDomainModel: CourseContentDomainModel): Promise<CourseContentDto>;

    getById(id: string): Promise<CourseContentDto>;

    search(filters: CourseContentSearchFilters): Promise<CourseContentSearchResults>;

    update(id: string, courseContentDomainModel: CourseContentDomainModel): Promise<CourseContentDto>;

    delete(id: string): Promise<boolean>;
}
